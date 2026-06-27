import fs from "node:fs/promises";
import type { Command } from "commander";
import { loadConfig } from "../config/load-config.js";
import { scanWorkspace } from "../engine/scan-workspace.js";
import { renderJson } from "../renderers/json.js";
import { renderMarkdown } from "../renderers/markdown.js";
import { renderSarif } from "../renderers/sarif.js";
import { renderTerminal } from "../renderers/terminal.js";
import { isAtLeastSeverity } from "../shared/severity.js";
import { resolveTarget } from "../targets/resolve-target.js";

export type OutputFormat = "terminal" | "json" | "sarif" | "markdown" | "auto";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Scan an AI-agent workspace without executing target code")
    .argument("[path]", "workspace path to scan", ".")
    .option("-c, --config <path>", "path to agentrisk config JSON")
    .option("--profile <profile>", "rule profile: recommended or strict")
    .option("--rule <id>", "run only this rule id; repeatable", collect, [])
    .option("--exclude-rule <id>", "disable a rule id", collect, [])
    .option("--include <glob>", "additional include glob", collect, [])
    .option("--exclude <glob>", "additional exclude glob", collect, [])
    .option("-f, --format <format>", "terminal, json, sarif, markdown, or auto", "auto")
    .option("-o, --output <path>", "write report to a file")
    .option("--fail-on <severity>", "exit 1 when findings are at least this severity", "high")
    .option("--min-severity <severity>", "only render findings at least this severity", "low")
    .option("--max-file-size <bytes>", "skip files larger than this size in bytes")
    .option("--max-download-size <bytes>", "maximum bytes to download for remote, GitHub, npm, or archive targets", "50000000")
    .option("--github-ref <ref>", "Git ref to use for GitHub targets")
    .option("--keep-temp", "keep extracted temporary target directories for debugging")
    .option("--gitignore", "apply target .gitignore during discovery (off by default)")
    .option("--follow-symlinks", "follow symlinks during discovery")
    .option("--strict-parse", "drop malformed JSON artifacts from rule evaluation")
    .option("--color <mode>", "auto, always, or never", "auto")
    .action(async (targetPath: string, options) => {
      let resolvedTarget: Awaited<ReturnType<typeof resolveTarget>> | undefined;
      try {
        resolvedTarget = await resolveTarget(targetPath, {
          maxDownloadSize: Number(options.maxDownloadSize),
          keepTemp: Boolean(options.keepTemp),
          githubRef: options.githubRef
        });
        const config = await loadConfig({
          rootPath: resolvedTarget.rootPath,
          configPath: options.config,
          ignoreLocalConfig: resolvedTarget.source.kind !== "local-directory",
          profile: options.profile,
          include: options.include,
          exclude: options.exclude,
          rules: options.rule,
          excludeRules: options.excludeRule,
          failOn: options.failOn,
          minSeverity: options.minSeverity,
          maxFileSize: options.maxFileSize,
          followSymlinks: options.followSymlinks,
          respectGitignore: options.gitignore === true,
          strictParse: options.strictParse,
          color: options.color
        });

        const result = await scanWorkspace(config, resolvedTarget.source);
        const filteredResult = filterResultBySeverity(result, config.minSeverity);
        const format = resolveFormat(options.format, Boolean(options.output));
        const rendered = render(format, filteredResult, config.color);

        if (options.output) {
          await fs.writeFile(options.output, rendered, "utf8");
          process.stderr.write(`AgentRisk wrote ${format} report to ${options.output}\n`);
        } else {
          process.stdout.write(rendered);
        }

        const shouldFail = result.summary.incomplete || result.findings.some((finding) => isAtLeastSeverity(finding.severity, config.failOn));
        process.exitCode = shouldFail ? 1 : 0;
      } catch (error) {
        process.stderr.write(`agentrisk scan failed: ${(error as Error).message}\n`);
        process.exitCode = isUsageOrConfigError(error) ? 2 : 3;
      } finally {
        await resolvedTarget?.cleanup();
      }
    });
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function resolveFormat(value: string, hasOutput: boolean): Exclude<OutputFormat, "auto"> {
  if (value === "auto") {
    return hasOutput || !process.stdout.isTTY ? "json" : "terminal";
  }
  if (value === "terminal" || value === "json" || value === "sarif" || value === "markdown") {
    return value;
  }
  throw new Error(`Unsupported format "${value}"`);
}

function render(format: Exclude<OutputFormat, "auto">, result: Parameters<typeof renderJson>[0], color: "auto" | "always" | "never"): string {
  if (format === "json") {
    return renderJson(result);
  }
  if (format === "sarif") {
    return renderSarif(result);
  }
  if (format === "markdown") {
    return renderMarkdown(result);
  }
  return renderTerminal(result, color);
}

function filterResultBySeverity(result: Parameters<typeof renderJson>[0], minSeverity: "low" | "medium" | "high" | "critical") {
  const findings = result.findings.filter((finding) => isAtLeastSeverity(finding.severity, minSeverity));
  const bySeverity = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
  }

  return {
    ...result,
    findings,
    risk: buildRiskForFindings(findings, result.summary.incomplete),
    summary: {
      ...result.summary,
      totalFindings: findings.length,
      bySeverity
    }
  };
}

function buildRiskForFindings(findings: Parameters<typeof renderJson>[0]["findings"], incomplete: boolean): Parameters<typeof renderJson>[0]["risk"] {
  const categories: Parameters<typeof renderJson>[0]["risk"]["categories"] = {};
  for (const finding of findings) {
    categories[finding.category] = (categories[finding.category] ?? 0) + 1;
  }
  if (incomplete) {
    return {
      verdict: "incomplete",
      reasons: ["One or more high-signal files could not be parsed or read."],
      categories
    };
  }
  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  if (critical > 0 || high > 0) {
    return {
      verdict: "block",
      reasons: [`${critical} critical and ${high} high findings require review before execution.`],
      categories
    };
  }
  if (medium > 0) {
    return {
      verdict: "review",
      reasons: [`${medium} medium findings should be reviewed before trusting this artifact.`],
      categories
    };
  }
  return {
    verdict: "pass",
    reasons: ["No findings at the current rule settings."],
    categories
  };
}

function isUsageOrConfigError(error: unknown): boolean {
  const message = (error as Error).message ?? "";
  return (
    message.includes("Unsupported format") ||
    message.includes("Invalid AgentRisk config") ||
    message.includes("Invalid enum value") ||
    message.includes("Expected") ||
    message.includes("ENOENT")
  );
}
