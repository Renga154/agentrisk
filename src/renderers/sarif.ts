import type { Finding, ScanResult } from "../artifacts/types.js";
import { builtinRules } from "../rules/registry.js";

export function renderSarif(result: ScanResult): string {
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: result.tool.name,
            version: result.tool.version,
            informationUri: "https://github.com/satourenware/agentrisk",
            rules: builtinRules.map((rule) => ({
              id: rule.id,
              name: rule.title,
              shortDescription: { text: rule.summary },
              fullDescription: { text: rule.summary },
              help: { text: defaultHelpForRule(rule.id) },
              defaultConfiguration: {
                level: sarifLevel(rule.defaultSeverity)
              },
              properties: {
                tags: rule.tags,
                precision: "medium"
              }
            }))
          }
        },
        results: result.findings.map(findingToSarif)
      }
    ]
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}

function findingToSarif(finding: Finding) {
  const location = finding.locations[0];
  return {
    ruleId: finding.ruleId,
    level: sarifLevel(finding.severity),
    message: {
      text: finding.message
    },
    locations: location
      ? [
          {
            physicalLocation: {
              artifactLocation: {
                uri: location.path
              },
              region: {
                startLine: location.line ?? 1,
                startColumn: location.column ?? 1,
                endLine: location.endLine,
                endColumn: location.endColumn
              }
            }
          }
        ]
      : [],
    partialFingerprints: {
      primaryLocationLineHash: finding.fingerprints.primary
    },
    properties: {
      severity: finding.severity,
      confidence: finding.confidence,
      category: finding.category,
      tags: finding.tags,
      evidence: finding.evidence
    }
  };
}

function sarifLevel(severity: Finding["severity"]): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") {
    return "error";
  }
  if (severity === "medium") {
    return "warning";
  }
  return "note";
}

function defaultHelpForRule(ruleId: string): string {
  return `See AgentRisk rule ${ruleId}.`;
}
