import pc from "picocolors";
import type { Finding, ScanResult } from "../artifacts/types.js";

export function renderTerminal(result: ScanResult, color: "auto" | "always" | "never" = "auto"): string {
  const c = color === "never" ? pc.createColors(false) : pc.createColors(color === "always" || process.stdout.isTTY);
  const lines = [
    c.bold("AgentRisk scan"),
    `Source: ${formatSource(result)}`,
    `Root: ${result.rootPath}`,
    `Files: ${result.summary.filesScanned} scanned, ${result.summary.filesMatched} matched`,
    `Verdict: ${formatVerdict(result, c)}`,
    `Findings: ${formatSummary(result, c)}`,
    ""
  ];

  if (result.summary.incomplete && result.findings.length === 0) {
    lines.push(c.red("Scan incomplete; review diagnostics before trusting this artifact."), "");
  } else if (result.findings.length === 0) {
    lines.push(c.green("No findings at the current rule settings."), "");
  } else {
    const grouped = groupFindings(result.findings);
    for (const severity of ["critical", "high", "medium", "low"] as const) {
      const findings = grouped[severity];
      if (!findings.length) {
        continue;
      }
      lines.push(c.bold(formatSeverity(severity, c)));
      for (const finding of findings) {
        const location = finding.locations[0];
        const locationText = location
          ? `${location.path}${location.line ? `:${location.line}` : ""}${location.column ? `:${location.column}` : ""}`
          : "unknown";
        lines.push(`  ${c.bold(finding.ruleId)} ${c.dim(`[${finding.confidence}]`)}`);
        lines.push(`    ${finding.message}`);
        lines.push(`    ${c.dim(locationText)}`);
        const evidence = finding.evidence.find((entry) => entry.kind === "text") ?? finding.evidence[0];
        if (evidence) {
          lines.push(`    ${c.dim("evidence:")} ${truncate(evidence.value, 140)}`);
        }
        if (finding.help) {
          lines.push(`    ${c.dim("fix:")} ${finding.help}`);
        }
      }
      lines.push("");
    }
  }

  const visibleDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.kind !== "skipped_file");
  if (visibleDiagnostics.length > 0) {
    lines.push(c.bold(result.summary.incomplete ? "Diagnostics (scan incomplete)" : "Diagnostics"));
    for (const diagnostic of visibleDiagnostics) {
      lines.push(`  ${diagnostic.kind}${diagnostic.path ? ` ${diagnostic.path}` : ""}: ${diagnostic.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatVerdict(result: ScanResult, c: ReturnType<typeof pc.createColors>): string {
  if (result.risk.verdict === "block" || result.risk.verdict === "incomplete") {
    return c.red(result.risk.verdict.toUpperCase());
  }
  if (result.risk.verdict === "review") {
    return c.yellow("REVIEW");
  }
  return c.green("PASS");
}

function formatSource(result: ScanResult): string {
  const suffix = result.source.note ? ` (${result.source.note})` : "";
  return `${result.source.kind} ${result.source.input}${suffix}`;
}

function groupFindings(findings: Finding[]): Record<Finding["severity"], Finding[]> {
  return {
    critical: findings.filter((finding) => finding.severity === "critical"),
    high: findings.filter((finding) => finding.severity === "high"),
    medium: findings.filter((finding) => finding.severity === "medium"),
    low: findings.filter((finding) => finding.severity === "low")
  };
}

function formatSummary(result: ScanResult, c: ReturnType<typeof pc.createColors>): string {
  const parts = [
    result.summary.bySeverity.critical ? c.red(`${result.summary.bySeverity.critical} critical`) : undefined,
    result.summary.bySeverity.high ? c.red(`${result.summary.bySeverity.high} high`) : undefined,
    result.summary.bySeverity.medium ? c.yellow(`${result.summary.bySeverity.medium} medium`) : undefined,
    result.summary.bySeverity.low ? c.blue(`${result.summary.bySeverity.low} low`) : undefined
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : c.green("0");
}

function formatSeverity(severity: Finding["severity"], c: ReturnType<typeof pc.createColors>): string {
  if (severity === "critical" || severity === "high") {
    return c.red(severity.toUpperCase());
  }
  if (severity === "medium") {
    return c.yellow(severity.toUpperCase());
  }
  return c.blue(severity.toUpperCase());
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}
