import type { InstructionDocData } from "../../artifacts/types.js";
import { lineLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const policyOverridePattern = /\b(?:ignore|override|forget|disregard)\b[\s\S]{0,120}\b(?:previous|higher-priority|system|developer|safety|security|policy|instructions?)\b/i;

export const instructionPolicyOverride: Rule = {
  id: "instruction-policy-override",
  title: "Agent instructions attempt to override higher-priority policy",
  summary: "Flags prompt-injection-style language in repo instruction files.",
  defaultSeverity: "high",
  tags: ["instructions", "prompt-injection"],
  scope: "document",
  targetKinds: ["instructionDoc", "cursorRuleFile"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as InstructionDocData;
      return data.lines.flatMap((line, index) => {
        if (!policyOverridePattern.test(line)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "instruction-policy-override",
            artifact,
            severity: "high",
            confidence: "medium",
            category: "instructions",
            message: "Agent instruction contains prompt-injection-style override language.",
            description: "Repo instructions should not ask an assistant to ignore higher-priority instructions or security policies.",
            help: "Remove override language. State project guidance directly without attempting to supersede system, developer, or user policy.",
            location: lineLocation(artifact, index, line.trim()),
            evidence: [{ kind: "text", value: line.trim() }],
            tags: ["instructions", "prompt-injection"]
          })
        ];
      });
    });
  }
};

