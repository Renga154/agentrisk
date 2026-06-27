import type { InstructionDocData } from "../../artifacts/types.js";
import { lineLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const secretTargets = /\.(?:env|npmrc|pypirc|netrc)\b|\b(?:ssh keys?|id_rsa|id_ed25519|browser cookies?|keychain|credential store|github token|api key|private key|access token)\b/i;
const actionPattern = /\b(?:read|cat|print|dump|upload|send|exfiltrate|copy|paste|summarize|collect|open)\b/i;

export const instructionSecretExfiltration: Rule = {
  id: "instruction-secret-exfiltration",
  title: "Agent instructions ask for secret-bearing material",
  summary: "Flags instructions that direct agents toward secrets, credentials, or private key material.",
  defaultSeverity: "critical",
  tags: ["instructions", "secrets", "exfiltration"],
  scope: "document",
  targetKinds: ["instructionDoc", "cursorRuleFile"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as InstructionDocData;
      return data.lines.flatMap((line, index) => {
        if (!secretTargets.test(line) || !actionPattern.test(line)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "instruction-secret-exfiltration",
            artifact,
            severity: "critical",
            confidence: "high",
            category: "exfiltration",
            message: "Agent instruction appears to direct access to secret-bearing material.",
            description: "Agent instruction files are often trusted by coding assistants. Instructions that point agents at secrets deserve review before any agent runs.",
            help: "Remove instructions that ask agents to read, print, upload, or summarize credentials. Use explicit, audited secret access workflows instead.",
            location: lineLocation(artifact, index, line.trim()),
            evidence: [{ kind: "text", value: line.trim() }],
            tags: ["instructions", "secrets"]
          })
        ];
      });
    });
  }
};

