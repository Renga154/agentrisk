import { loadConfig } from "../config/load-config.js";
import type { Severity } from "../shared/severity.js";
import { isAtLeastSeverity } from "../shared/severity.js";
import { resolveTarget } from "../targets/resolve-target.js";
import { renderJson } from "../renderers/json.js";
import { renderMarkdown } from "../renderers/markdown.js";
import { renderSarif } from "../renderers/sarif.js";
import { renderTerminal } from "../renderers/terminal.js";
import type { ScanResult } from "../artifacts/types.js";
import { getRuleById } from "../rules/registry.js";
import { scanWorkspace } from "./scan-workspace.js";

export type OutputFormat = "terminal" | "json" | "sarif" | "markdown" | "auto";
export type ResolvedOutputFormat = Exclude<OutputFormat, "auto">;

export interface RunScanInput {
  target?: string;
  configPath?: string;
  profile?: string;
  rules?: string[];
  excludeRules?: string[];
  include?: string[];
  exclude?: string[];
  format?: OutputFormat;
  output?: string;
  failOn?: string;
  minSeverity?: string;
  maxFileSize?: string | number;
  maxDownloadSize?: string | number;
  githubRef?: string;
  keepTemp?: boolean;
  respectGitignore?: boolean;
  followSymlinks?: boolean;
  strictParse?: boolean;
  color?: string;
}

export interface RunScanResult {
  result: ScanResult;
  filteredResult: ScanResult;
  rendered: string;
  format: ResolvedOutputFormat;
  shouldFail: boolean;
  exitCode: 0 | 1;
}

export async function runScan(input: RunScanInput = {}): Promise<RunScanResult> {
  const target = input.target ?? ".";
  assertKnownRuleIds([...(input.rules ?? []), ...(input.excludeRules ?? [])]);
  let resolvedTarget: Awaited<ReturnType<typeof resolveTarget>> | undefined;

  try {
    resolvedTarget = await resolveTarget(target, {
      maxDownloadSize: Number(input.maxDownloadSize ?? 50_000_000),
      keepTemp: Boolean(input.keepTemp),
      githubRef: input.githubRef
    });

    const config = await loadConfig({
      rootPath: resolvedTarget.rootPath,
      configPath: input.configPath,
      ignoreLocalConfig: resolvedTarget.source.kind !== "local-directory",
      profile: input.profile,
      include: input.include,
      exclude: input.exclude,
      rules: input.rules,
      excludeRules: input.excludeRules,
      failOn: input.failOn,
      minSeverity: input.minSeverity,
      maxFileSize: input.maxFileSize === undefined ? undefined : String(input.maxFileSize),
      followSymlinks: input.followSymlinks,
      respectGitignore: input.respectGitignore,
      strictParse: input.strictParse,
      color: input.color
    });

    const result = await scanWorkspace(config, resolvedTarget.source);
    const filteredResult = filterResultBySeverity(result, config.minSeverity);
    const format = resolveFormat(input.format ?? "auto", Boolean(input.output));
    const rendered = render(format, filteredResult, config.color);
    const shouldFail = result.summary.incomplete || result.findings.some((finding) => isAtLeastSeverity(finding.severity, config.failOn));

    return {
      result,
      filteredResult,
      rendered,
      format,
      shouldFail,
      exitCode: shouldFail ? 1 : 0
    };
  } finally {
    await resolvedTarget?.cleanup();
  }
}

export function resolveFormat(value: string, hasOutput: boolean): ResolvedOutputFormat {
  if (value === "auto") {
    return hasOutput || !process.stdout.isTTY ? "json" : "terminal";
  }
  if (value === "terminal" || value === "json" || value === "sarif" || value === "markdown") {
    return value;
  }
  throw new Error(`Unsupported format "${value}"`);
}

export function render(format: ResolvedOutputFormat, result: ScanResult, color: "auto" | "always" | "never"): string {
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

export function filterResultBySeverity(result: ScanResult, minSeverity: Severity): ScanResult {
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

export function isUsageOrConfigError(error: unknown): boolean {
  const message = (error as Error).message ?? "";
  return (
    message.includes("Unsupported format") ||
    message.includes("Invalid AgentRisk config") ||
    message.includes("Invalid enum value") ||
    message.includes("Expected") ||
    message.includes("Unknown rule id") ||
    message.includes("ENOENT")
  );
}

function assertKnownRuleIds(ids: string[]): void {
  const unknown = ids.filter((id) => !getRuleById(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown rule id${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}. Run "agentrisk rules list" to see available ids.`);
  }
}

function buildRiskForFindings(findings: ScanResult["findings"], incomplete: boolean): ScanResult["risk"] {
  const categories: ScanResult["risk"]["categories"] = {};
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
