import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import { loadConfig } from "../../src/config/load-config.js";
import { isUsageOrConfigError, runScan } from "../../src/engine/run-scan.js";
import { scanWorkspace } from "../../src/engine/scan-workspace.js";
import { renderSarif } from "../../src/renderers/sarif.js";

const fixtures = path.resolve("test/fixtures");

describe("scanWorkspace", () => {
  it("returns no findings for the clean fixture", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "clean-repo") });
    const result = await scanWorkspace(config);

    expect(result.summary.totalFindings).toBe(0);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.kind === "parse_error")).toHaveLength(0);
  });

  it("detects high-signal MCP, package, and instruction risks", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "risky-mcp") });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "mcp-remote-fetch-exec",
        "mcp-shell-wrapper-command",
        "mcp-sensitive-env-pass-through",
        "mcp-unpinned-dlx",
        "package-postinstall-remote-exec",
        "package-script-shell-trampoline",
        "instruction-secret-exfiltration",
        "instruction-approval-bypass",
        "instruction-policy-override"
      ])
    );
    expect(result.summary.bySeverity.critical).toBeGreaterThanOrEqual(2);
  });

  it("keeps malformed JSON as diagnostics", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "malformed-json") });
    const result = await scanWorkspace(config);

    expect(result.diagnostics.some((diagnostic) => diagnostic.kind === "parse_error")).toBe(true);
    expect(result.summary.incomplete).toBe(true);
  });

  it("detects conflicting workspace instructions", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "conflicting-instructions") });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).toContain("conflicting-agent-instructions");
  });

  it("detects launch-chain provenance risks", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "launch-chain") });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "mcp-privileged-container",
        "mcp-external-binary-reference",
        "mcp-unpinned-dlx"
      ])
    );
  });

  it("treats SKILL.md as an agent instruction artifact", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "skill-doc") });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).toContain("instruction-secret-exfiltration");
  });

  it("renders valid-looking SARIF 2.1.0", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "risky-mcp") });
    const result = await scanWorkspace(config);
    const sarif = JSON.parse(renderSarif(result));

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.rules.length).toBeGreaterThan(0);
    expect(sarif.runs[0].results.length).toBe(result.findings.length);
  });

  it("emits SARIF notifications for incomplete scans", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "malformed-json") });
    const result = await scanWorkspace(config);
    const sarif = JSON.parse(renderSarif(result));

    expect(sarif.runs[0].invocations[0].executionSuccessful).toBe(false);
    expect(sarif.runs[0].invocations[0].toolExecutionNotifications[0].message.text).toContain("parse_error");
  });

  it("does not flag benign MCP args containing 'requests' or 'get(' as remote fetch-exec", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "benign-mcp-args") });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain("mcp-remote-fetch-exec");
  });

  it("flags python -c one-liners that fetch and execute remote code", async () => {
    const config = await loadConfig({ rootPath: path.join(fixtures, "python-fetch-exec") });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).toContain("mcp-remote-fetch-exec");
  });

  it("still scans default high-signal files when --include adds a glob", async () => {
    const config = await loadConfig({
      rootPath: path.join(fixtures, "risky-mcp"),
      include: ["**/*.custom"]
    });
    const result = await scanWorkspace(config);

    expect(result.findings.map((finding) => finding.ruleId)).toContain("mcp-remote-fetch-exec");
  });
});

describe("runScan input validation", () => {
  it("rejects unknown rule ids as a usage error", async () => {
    const attempt = runScan({ target: path.join(fixtures, "risky-mcp"), rules: ["mcp-remote-fetch-exc"] });

    await expect(attempt).rejects.toThrow(/Unknown rule id/);
    await attempt.catch((error) => {
      expect(isUsageOrConfigError(error)).toBe(true);
    });
  });

  it("keeps the rendered verdict consistent with the exit code when minSeverity hides findings", async () => {
    const scan = await runScan({
      target: path.join(fixtures, "medium-only"),
      format: "json",
      minSeverity: "critical",
      failOn: "medium"
    });

    const report = JSON.parse(scan.rendered);
    expect(scan.exitCode).toBe(1);
    expect(report.findings).toHaveLength(0);
    expect(report.risk.verdict).toBe("review");
  });
});

describe("archive extraction limits", () => {
  it("rejects archives whose extracted size exceeds the cap", { timeout: 30_000 }, async () => {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "agentrisk-bomb-"));
    try {
      await fs.mkdir(path.join(workDir, "payload"));
      await fs.writeFile(path.join(workDir, "payload", "zeros.bin"), Buffer.alloc(20_000_000));
      const archivePath = path.join(workDir, "bomb.tgz");
      await tar.create({ gzip: true, file: archivePath, cwd: workDir }, ["payload"]);

      await expect(
        runScan({ target: archivePath, format: "json", maxDownloadSize: 1_000_000 })
      ).rejects.toThrow(/max extracted size/);
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  });
});
