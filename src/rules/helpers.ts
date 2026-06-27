import type { Artifact, Finding } from "../artifacts/types.js";
import { shortHash } from "../shared/hashing.js";
import { locateRegex, locateText, type TextLocation } from "../shared/text-location.js";
import type { CreateFindingInput, RuleContext } from "./types.js";

export function createRuleContext(rootPath: string, profile: "recommended" | "strict"): RuleContext {
  return {
    rootPath,
    profile,
    createFinding(input: CreateFindingInput): Finding {
      const fingerprintSource = [
        input.ruleId,
        input.artifact.path,
        input.message,
        ...input.evidence.map((entry) => `${entry.kind}:${entry.value}`)
      ].join("\n");

      return {
        id: `${input.ruleId}:${shortHash(fingerprintSource)}`,
        ruleId: input.ruleId,
        severity: input.severity,
        confidence: input.confidence,
        category: input.category,
        message: input.message,
        description: input.description,
        help: input.help,
        locations: [
          {
            path: input.artifact.path,
            ...input.location
          }
        ],
        evidence: input.evidence,
        fingerprints: {
          primary: shortHash(fingerprintSource)
        },
        tags: input.tags
      };
    }
  };
}

export function combinedCommand(command: string | undefined, args: string[]): string {
  return [command, ...args].filter(Boolean).join(" ");
}

export function regexLocation(artifact: Artifact, regex: RegExp): TextLocation | undefined {
  regex.lastIndex = 0;
  return locateRegex(artifact.raw, regex);
}

export function textLocation(artifact: Artifact, text: string): TextLocation | undefined {
  return locateText(artifact.raw, text);
}

export function lineLocation(artifact: Artifact, lineIndex: number, text?: string): TextLocation {
  const column = text ? Math.max(artifact.raw.split(/\r?\n/)[lineIndex]?.indexOf(text) ?? 0, 0) + 1 : 1;
  return {
    line: lineIndex + 1,
    column,
    endLine: lineIndex + 1,
    endColumn: text ? column + text.length : undefined
  };
}

export function isTextArtifact(artifact: Artifact): boolean {
  return artifact.kind === "instructionDoc" || artifact.kind === "cursorRuleFile";
}

