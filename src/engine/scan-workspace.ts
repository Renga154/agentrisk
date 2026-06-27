import { buildArtifacts } from "../artifacts/build-artifacts.js";
import type { ScanResult } from "../artifacts/types.js";
import type { ResolvedConfig } from "../config/schema.js";
import { discoverFiles } from "../discovery/targets.js";
import { evaluateRules } from "./evaluate-rules.js";
import { TOOL_NAME, VERSION } from "../version.js";

export async function scanWorkspace(config: ResolvedConfig): Promise<ScanResult> {
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

  return {
    schemaVersion: 1,
    tool: {
      name: TOOL_NAME,
      version: VERSION
    },
    scannedAt: new Date().toISOString(),
    rootPath: config.rootPath,
    profile: config.profile,
    summary: {
      totalFindings: evaluation.findings.length,
      bySeverity,
      filesScanned: artifactResult.artifacts.length,
      filesMatched: discovery.files.length,
      parseErrors: diagnostics.filter((diagnostic) => diagnostic.kind === "parse_error").length
    },
    findings: evaluation.findings,
    diagnostics,
    stats: {
      filesDiscovered: discovery.files.length + discovery.skipped.length,
      bytesScanned: artifactResult.bytesScanned,
      rulesEvaluated: evaluation.rulesEvaluated
    }
  };
}

