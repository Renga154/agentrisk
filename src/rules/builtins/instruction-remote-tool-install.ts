import type { InstructionDocData } from "../../artifacts/types.js";
import { lineLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const installPattern = /\b(?:curl|wget|iwr|irm)\b[\s\S]{0,160}\|\s*(?:sh|bash|zsh|fish|iex|invoke-expression)\b|\b(?:npm|pnpm|yarn|pip|uv|brew|cargo)\b[\s\S]{0,80}\b(?:install|add|dlx|x)\b/i;

export const instructionRemoteToolInstall: Rule = {
  id: "instruction-remote-tool-install",
  title: "Agent instructions ask the agent to install or execute tools",
  summary: "Flags instruction lines that may cause an agent to install or execute external tools.",
  defaultSeverity: "medium",
  tags: ["instructions", "supply-chain"],
  scope: "document",
  targetKinds: ["instructionDoc", "cursorRuleFile"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as InstructionDocData;
      return data.lines.flatMap((line, index) => {
        if (!installPattern.test(line)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "instruction-remote-tool-install",
            artifact,
            severity: "medium",
            confidence: "medium",
            category: "supply-chain",
            message: "Agent instruction asks for tool installation or remote execution behavior.",
            description: "Instructions that tell agents to install tools can expand the trusted execution surface.",
            help: "Prefer documented setup steps that humans run explicitly, with pinned versions and checksums where possible.",
            location: lineLocation(artifact, index, line.trim()),
            evidence: [{ kind: "text", value: line.trim() }],
            tags: ["instructions", "install"]
          })
        ];
      });
    });
  }
};

