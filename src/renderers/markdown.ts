import type { ScanResult } from "../artifacts/types.js";

export function renderMarkdown(result: ScanResult): string {
  const lines = [
    "# AgentRisk Scan Report",
    "",
    `- Source: \`${result.source.kind} ${result.source.input}\`${result.source.note ? ` (${result.source.note})` : ""}`,
    `- Root: \`${result.rootPath}\``,
    `- Scanned at: \`${result.scannedAt}\``,
    `- Files scanned: ${result.summary.filesScanned}`,
    `- Verdict: ${result.risk.verdict}`,
    `- Findings: ${result.summary.totalFindings}`,
    `- Severity: critical ${result.summary.bySeverity.critical}, high ${result.summary.bySeverity.high}, medium ${result.summary.bySeverity.medium}, low ${result.summary.bySeverity.low}`,
    `- Incomplete: ${result.summary.incomplete ? "yes" : "no"}`,
    ""
  ];

  if (result.findings.length === 0) {
    lines.push(result.summary.incomplete ? "Scan incomplete; review diagnostics before trusting this artifact." : "No findings.");
  } else {
    lines.push("## Findings", "");
    for (const finding of result.findings) {
      const location = finding.locations[0];
      const locationText = location
        ? `${location.path}${location.line ? `:${location.line}` : ""}`
        : "unknown location";
      lines.push(`### ${finding.severity.toUpperCase()} ${finding.ruleId}`);
      lines.push("");
      lines.push(`- Location: \`${locationText}\``);
      lines.push(`- Confidence: ${finding.confidence}`);
      lines.push(`- Message: ${finding.message}`);
      if (finding.help) {
        lines.push(`- Help: ${finding.help}`);
      }
      const evidence = finding.evidence.find((entry) => entry.kind === "text") ?? finding.evidence[0];
      if (evidence) {
        lines.push(`- Evidence: \`${evidence.value}\``);
      }
      lines.push("");
    }
  }

  if (result.diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    for (const diagnostic of result.diagnostics) {
      lines.push(`- ${diagnostic.kind}${diagnostic.path ? ` \`${diagnostic.path}\`` : ""}: ${diagnostic.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
