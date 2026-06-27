import type { InstructionDocData } from "../../artifacts/types.js";
import { lineLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const approvalBypassPattern = /\b(?:do not ask|don't ask|never ask|skip|bypass|disable|ignore)\b[\s\S]{0,80}\b(?:approval|confirmation|review|permission|human|user confirmation|security check)\b/i;

export const instructionApprovalBypass: Rule = {
  id: "instruction-approval-bypass",
  title: "Agent instructions encourage bypassing approvals",
  summary: "Flags instructions that tell agents to avoid confirmation, human review, or security checks.",
  defaultSeverity: "high",
  tags: ["instructions", "policy"],
  scope: "document",
  targetKinds: ["instructionDoc", "cursorRuleFile"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as InstructionDocData;
      return data.lines.flatMap((line, index) => {
        if (!approvalBypassPattern.test(line)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "instruction-approval-bypass",
            artifact,
            severity: "high",
            confidence: "medium",
            category: "policy",
            message: "Agent instruction appears to encourage bypassing review or approval.",
            description: "Approval-bypass language can weaken local agent safety boundaries and reviewer expectations.",
            help: "Make approval policy explicit and preserve user or maintainer confirmation for risky operations.",
            location: lineLocation(artifact, index, line.trim()),
            evidence: [{ kind: "text", value: line.trim() }],
            tags: ["instructions", "approval"]
          })
        ];
      });
    });
  }
};

