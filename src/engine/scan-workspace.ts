import { buildArtifacts } from "../artifacts/build-artifacts.js";
import type { ScanResult } from "../artifacts/types.js";
import type { ResolvedConfig } from "../config/schema.js";
import { discoverFiles } from "../discovery/targets.js";
import { evaluateRules } from "./evaluate-rules.js";
import { TOOL_NAME, VERSION } from "../version.js";
import type { TargetSource } from "../targets/types.js";

export async function scanWorkspace(config: ResolvedConfig, source?: TargetSource): Promise<ScanResult> {
  const discovery = await discoverFiles(config);
  const artifactResult = await buildArtifacts(discovery.files, config);
  const evaluation = evaluateRules(artifactResult.artifacts, config);

  const diagnostics = [
    ...artifactResult.diagnostics,
    ...discovery.skipped.map((skipped) => ({
      kind: "skipped_file" as const,
      path: skipped.path,
      message: skipped.reason
    }))
  ];

  const bySeverity = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  for (const finding of evaluation.findings) {
    bySeverity[finding.severity] += 1;
  }

  const parseErrors = diagnostics.filter((diagnostic) => diagnostic.kind === "parse_error").length;
  const readErrors = diagnostics.filter((diagnostic) => diagnostic.kind === "read_error").length;

  return {
    schemaVersion: 1,
    tool: {
      name: TOOL_NAME,
      version: VERSION
    },
    source: source ?? {
      kind: "local-directory",
      input: config.rootPath,
      resolved: config.rootPath,
      temporary: false
    },
    scannedAt: new Date().toISOString(),
    rootPath: config.rootPath,
    profile: config.profile,
    summary: {
      totalFindings: evaluation.findings.length,
      bySeverity,
      filesScanned: artifactResult.artifacts.length,
      filesMatched: discovery.files.length,
      parseErrors,
      readErrors,
      incomplete: parseErrors > 0 || readErrors > 0
    },
    risk: buildRiskSummary(evaluation.findings, parseErrors > 0 || readErrors > 0),
    findings: evaluation.findings,
    diagnostics,
    stats: {
      filesDiscovered: discovery.files.length + discovery.skipped.length,
      bytesScanned: artifactResult.bytesScanned,
      rulesEvaluated: evaluation.rulesEvaluated
    }
  };
}

function buildRiskSummary(findings: ScanResult["findings"], incomplete: boolean): ScanResult["risk"] {
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
