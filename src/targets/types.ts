export type TargetKind =
  | "local-directory"
  | "local-archive"
  | "github"
  | "npm"
  | "remote-archive";

export interface TargetSource {
  kind: TargetKind;
  input: string;
  resolved: string;
  temporary: boolean;
  note?: string;
}

export interface ResolvedTarget {
  rootPath: string;
  source: TargetSource;
  cleanup(): Promise<void>;
}

export interface TargetOptions {
  maxDownloadSize: number;
  keepTemp: boolean;
  githubRef?: string;
}

