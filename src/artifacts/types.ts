import type { Severity } from "../shared/severity.js";

export type ArtifactKind =
  | "mcpConfig"
  | "packageJson"
  | "instructionDoc"
  | "cursorRuleFile"
  | "unknownJson";

export interface Artifact<TData = unknown> {
  kind: ArtifactKind;
  path: string;
  absolutePath: string;
  raw: string;
  data: TData;
  hash: string;
}

export interface McpServerDefinition {
  name: string;
  command?: string;
  args: string[];
  env: Record<string, unknown>;
  raw: unknown;
  jsonPointer: string;
}

export interface McpConfigData {
  servers: McpServerDefinition[];
}

export interface PackageJsonData {
  name?: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
}

export interface InstructionDocData {
  title?: string;
  text: string;
  lines: string[];
}

export interface ScanDiagnostic {
  kind: "parse_error" | "read_error" | "config_error" | "skipped_file";
  message: string;
  path?: string;
}

export type Confidence = "low" | "medium" | "high";

export type FindingCategory =
  | "execution"
  | "instructions"
  | "exfiltration"
  | "trust"
  | "policy"
  | "supply-chain";

export interface FindingLocation {
  path: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface FindingEvidence {
  kind: "text" | "jsonPointer" | "scriptName" | "serverName";
  value: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  confidence: Confidence;
  category: FindingCategory;
  message: string;
  description?: string;
  help?: string;
  locations: FindingLocation[];
  evidence: FindingEvidence[];
  fingerprints: {
    primary: string;
  };
  tags: string[];
}

export interface ScanSummary {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  filesScanned: number;
  filesMatched: number;
  parseErrors: number;
}

export interface ScanStats {
  filesDiscovered: number;
  bytesScanned: number;
  rulesEvaluated: number;
}

export interface ScanResult {
  schemaVersion: 1;
  tool: {
    name: string;
    version: string;
  };
  scannedAt: string;
  rootPath: string;
  profile: "recommended" | "strict";
  summary: ScanSummary;
  findings: Finding[];
  diagnostics: ScanDiagnostic[];
  stats: ScanStats;
}

