import type { ResolvedConfig } from "./schema.js";

export const defaultInclude = [
  ".mcp.json",
  "mcp.json",
  "**/.mcp.json",
  "**/mcp.json",
  "claude_desktop_config.json",
  "**/claude_desktop_config.json",
  ".cursor/rules/**/*",
  "**/.cursor/rules/**/*",
  ".github/agents/**/*",
  "**/.github/agents/**/*",
  "SKILL.md",
  "**/SKILL.md",
  "AGENTS.md",
  "**/AGENTS.md",
  "CLAUDE.md",
  "**/CLAUDE.md",
  "GEMINI.md",
  "**/GEMINI.md",
  ".github/copilot-instructions.md",
  "**/.github/copilot-instructions.md",
  "package.json",
  "**/package.json"
];

export const defaultExclude = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/.cache/**"
];

export const defaultConfig: Omit<ResolvedConfig, "rootPath" | "color"> = {
  version: 1,
  profile: "recommended",
  include: defaultInclude,
  exclude: defaultExclude,
  onlyRules: [],
  rules: {},
  failOn: "high",
  minSeverity: "low",
  maxFileSize: 1_000_000,
  followSymlinks: false,
  respectGitignore: false,
  strictParse: true
};
