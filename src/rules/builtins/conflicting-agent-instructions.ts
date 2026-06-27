import type { Artifact, InstructionDocData } from "../../artifacts/types.js";
import { lineLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const strictPatterns = [
  /\bdo not\b[\s\S]{0,40}\b(?:network|internet|external request|install)\b/i,
  /\bnever\b[\s\S]{0,40}\b(?:network|internet|external request|install)\b/i,
  /\bmust ask\b[\s\S]{0,60}\b(?:before|prior to)\b[\s\S]{0,60}\b(?:install|execute|delete|network)\b/i
];

const permissivePatterns = [
  /\b(?:use|access)\b[\s\S]{0,40}\b(?:network|internet)\b[\s\S]{0,40}\b(?:freely|without asking|without approval)\b/i,
  /\b(?:install|execute|delete)\b[\s\S]{0,60}\b(?:without asking|without approval|automatically)\b/i,
  /\bno need to ask\b[\s\S]{0,80}\b(?:install|execute|delete|network)\b/i
];

export const conflictingAgentInstructions: Rule = {
  id: "conflicting-agent-instructions",
  title: "Agent instruction files contain conflicting safety guidance",
  summary: "Flags workspaces with one instruction file restricting risky operations and another allowing similar behavior.",
  defaultSeverity: "medium",
  tags: ["instructions", "policy", "workspace"],
  scope: "workspace",
  targetKinds: ["instructionDoc", "cursorRuleFile"],
  evaluate(ctx, artifacts) {
    const instructionArtifacts = artifacts.filter((artifact) => artifact.kind === "instructionDoc" || artifact.kind === "cursorRuleFile");
    const strictMatch = findFirstMatch(instructionArtifacts, strictPatterns);
    const permissiveMatch = findFirstMatch(instructionArtifacts, permissivePatterns);

    if (!strictMatch || !permissiveMatch || strictMatch.artifact.path === permissiveMatch.artifact.path) {
      return [];
    }

    return [
      ctx.createFinding({
        ruleId: "conflicting-agent-instructions",
        artifact: permissiveMatch.artifact,
        severity: "medium",
        confidence: "low",
        category: "policy",
        message: "Agent instruction files appear to conflict on approval or execution policy.",
        description: "Different assistants may choose different instruction files. Conflicting safety language can create surprising behavior.",
        help: "Consolidate shared safety policy in a single source or make tool-specific differences explicit.",
        location: lineLocation(permissiveMatch.artifact, permissiveMatch.lineIndex, permissiveMatch.line.trim()),
        evidence: [
          { kind: "text", value: `${strictMatch.artifact.path}: ${strictMatch.line.trim()}` },
          { kind: "text", value: `${permissiveMatch.artifact.path}: ${permissiveMatch.line.trim()}` }
        ],
        tags: ["instructions", "policy-conflict"]
      })
    ];
  }
};

function findFirstMatch(artifacts: Artifact[], patterns: RegExp[]) {
  for (const artifact of artifacts) {
    const data = artifact.data as InstructionDocData;
    for (let lineIndex = 0; lineIndex < data.lines.length; lineIndex += 1) {
      const line = data.lines[lineIndex]!;
      if (patterns.some((pattern) => pattern.test(line))) {
        return { artifact, lineIndex, line };
      }
    }
  }
  return undefined;
}

