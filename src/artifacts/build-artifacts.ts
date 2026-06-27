import fs from "node:fs/promises";
import type { ResolvedConfig } from "../config/schema.js";
import type { DiscoveredFile } from "../discovery/targets.js";
import { sha256 } from "../shared/hashing.js";
import type { Artifact, ScanDiagnostic } from "./types.js";
import { parseJson } from "../parsers/json.js";
import { parseInstructionDoc } from "../parsers/instruction-doc.js";
import { parseMcpConfig } from "../parsers/mcp-config.js";
import { parsePackageJson } from "../parsers/package-json.js";

export interface ArtifactBuildResult {
  artifacts: Artifact[];
  diagnostics: ScanDiagnostic[];
  bytesScanned: number;
}

export async function buildArtifacts(files: DiscoveredFile[], config: ResolvedConfig): Promise<ArtifactBuildResult> {
  const artifacts: Artifact[] = [];
  const diagnostics: ScanDiagnostic[] = [];
  let bytesScanned = 0;

  for (const file of files) {
    let raw: string;
    try {
      raw = await fs.readFile(file.absolutePath, "utf8");
      bytesScanned += Buffer.byteLength(raw);
    } catch (error) {
      diagnostics.push({
        kind: "read_error",
        path: file.path,
        message: (error as Error).message
      });
      continue;
    }

    const hash = sha256(raw);
    const kind = inferKind(file.path);

    if (kind === "mcpConfig" || kind === "packageJson" || kind === "unknownJson") {
      const parsed = parseJson(raw);
      if (!parsed.ok) {
      diagnostics.push({
        kind: "parse_error",
        path: file.path,
        message: parsed.message
      });
        if (config.strictParse) {
          continue;
        }
        const fallbackData =
          kind === "mcpConfig"
            ? parseMcpConfig({})
            : kind === "packageJson"
              ? parsePackageJson({})
              : {};
        artifacts.push({
          kind,
          path: file.path,
          absolutePath: file.absolutePath,
          raw,
          data: fallbackData,
          hash
        });
        continue;
      }

      const data =
        kind === "mcpConfig"
          ? parseMcpConfig(parsed.value)
          : kind === "packageJson"
            ? parsePackageJson(parsed.value)
            : parsed.value;

      artifacts.push({ kind, path: file.path, absolutePath: file.absolutePath, raw, data, hash });
      continue;
    }

    artifacts.push({
      kind,
      path: file.path,
      absolutePath: file.absolutePath,
      raw,
      data: parseInstructionDoc(raw),
      hash
    });
  }

  return { artifacts, diagnostics, bytesScanned };
}

function inferKind(filePath: string): Artifact["kind"] {
  const normalized = filePath.replace(/\\/g, "/");
  const basename = normalized.split("/").at(-1);

  if (basename === "package.json") {
    return "packageJson";
  }

  if (basename === ".mcp.json" || basename === "mcp.json" || basename === "claude_desktop_config.json") {
    return "mcpConfig";
  }

  if (normalized.includes("/.cursor/rules/") || normalized.startsWith(".cursor/rules/")) {
    return "cursorRuleFile";
  }

  if (
    basename === "AGENTS.md" ||
    basename === "CLAUDE.md" ||
    basename === "GEMINI.md" ||
    basename === "SKILL.md" ||
    normalized.startsWith(".github/agents/") ||
    normalized.includes("/.github/agents/") ||
    normalized === ".github/copilot-instructions.md" ||
    normalized.endsWith("/.github/copilot-instructions.md")
  ) {
    return "instructionDoc";
  }

  if (basename?.endsWith(".json")) {
    return "unknownJson";
  }

  return "instructionDoc";
}
