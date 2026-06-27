import type { Artifact, ArtifactKind, Finding, FindingCategory } from "../artifacts/types.js";
import type { Severity } from "../shared/severity.js";

export interface RuleContext {
  rootPath: string;
  profile: "recommended" | "strict";
  createFinding(input: CreateFindingInput): Finding;
}

export interface CreateFindingInput {
  ruleId: string;
  artifact: Artifact;
  severity: Severity;
  confidence: "low" | "medium" | "high";
  category: FindingCategory;
  message: string;
  description?: string;
  help?: string;
  location?: {
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  };
  evidence: Finding["evidence"];
  tags: string[];
}

export interface Rule {
  id: string;
  title: string;
  summary: string;
  defaultSeverity: Severity;
  tags: string[];
  scope: "document" | "workspace";
  targetKinds: ArtifactKind[];
  evaluate(ctx: RuleContext, artifacts: Artifact[]): Finding[];
}

