import type { Artifact, Finding } from "../artifacts/types.js";
import type { ResolvedConfig } from "../config/schema.js";
import { builtinRules } from "../rules/registry.js";
import { createRuleContext } from "../rules/helpers.js";
import type { Rule } from "../rules/types.js";
import type { Severity } from "../shared/severity.js";

export interface RuleEvaluationResult {
  findings: Finding[];
  rulesEvaluated: number;
  rules: Rule[];
}

export function evaluateRules(artifacts: Artifact[], config: ResolvedConfig): RuleEvaluationResult {
  const enabledRules = builtinRules.filter((rule) => isRuleEnabled(rule, config));
  const ctx = createRuleContext(config.rootPath, config.profile);
  const findings: Finding[] = [];

  for (const rule of enabledRules) {
    const matchingArtifacts =
      rule.scope === "workspace"
        ? artifacts.filter((artifact) => rule.targetKinds.includes(artifact.kind))
        : artifacts.filter((artifact) => rule.targetKinds.includes(artifact.kind));

    if (matchingArtifacts.length === 0) {
      continue;
    }

    const ruleFindings = rule.evaluate(ctx, matchingArtifacts).map((finding) => {
      const overrideSeverity = getRuleSeverity(rule, config);
      const severity = overrideSeverity ?? (config.profile === "strict" && finding.severity === "medium" ? "high" : finding.severity);
      return severity === finding.severity ? finding : { ...finding, severity };
    });
    findings.push(...ruleFindings);
  }

  findings.sort((a, b) => {
    const first = a.locations[0]?.path.localeCompare(b.locations[0]?.path ?? "") ?? 0;
    if (first !== 0) {
      return first;
    }
    return a.ruleId.localeCompare(b.ruleId);
  });

  return { findings, rulesEvaluated: enabledRules.length, rules: enabledRules };
}

function isRuleEnabled(rule: Rule, config: ResolvedConfig): boolean {
  if (config.onlyRules.length > 0 && !config.onlyRules.includes(rule.id)) {
    return false;
  }
  const override = config.rules[rule.id];
  if (override === "off") {
    return false;
  }
  if (typeof override === "object" && override.enabled === false) {
    return false;
  }
  return true;
}

function getRuleSeverity(rule: Rule, config: ResolvedConfig): Severity | undefined {
  const override = config.rules[rule.id];
  if (!override || override === "off") {
    return undefined;
  }
  if (typeof override === "string") {
    return override;
  }
  return override.level;
}
