import fs from "node:fs/promises";
import path from "node:path";
import { defaultConfig } from "./defaults.js";
import { type ResolvedConfig, type UserConfig, userConfigSchema } from "./schema.js";

export interface LoadConfigInput {
  rootPath: string;
  configPath?: string;
  profile?: string;
  include?: string[];
  exclude?: string[];
  rules?: string[];
  excludeRules?: string[];
  failOn?: string;
  minSeverity?: string;
  maxFileSize?: string;
  followSymlinks?: boolean;
  noGitignore?: boolean;
  strictParse?: boolean;
  color?: string;
}

export async function loadConfig(input: LoadConfigInput): Promise<ResolvedConfig> {
  const rootPath = path.resolve(input.rootPath);
  const fileConfig = await readConfigFile(rootPath, input.configPath);

  const envConfig: Partial<UserConfig> = {
    profile: parseStringEnv("AGENTRISK_PROFILE") as UserConfig["profile"],
    failOn: parseStringEnv("AGENTRISK_FAIL_ON") as UserConfig["failOn"],
    minSeverity: parseStringEnv("AGENTRISK_MIN_SEVERITY") as UserConfig["minSeverity"]
  };

  const cliRuleOverrides = buildRuleOverrides(input.rules, input.excludeRules);

  const merged: ResolvedConfig = {
    ...defaultConfig,
    rootPath,
    color: parseColor(input.color),
    ...compact(fileConfig),
    ...compact(envConfig),
    ...compact({
      profile: input.profile,
      include: input.include?.length ? input.include : undefined,
      exclude: input.exclude?.length ? input.exclude : undefined,
      onlyRules: input.rules?.length ? input.rules : undefined,
      failOn: input.failOn,
      minSeverity: input.minSeverity,
      maxFileSize: input.maxFileSize ? Number(input.maxFileSize) : undefined,
      followSymlinks: input.followSymlinks,
      respectGitignore: input.noGitignore === true ? false : undefined,
      strictParse: input.strictParse
    }),
    rules: {
      ...defaultConfig.rules,
      ...(fileConfig.rules ?? {}),
      ...cliRuleOverrides
    }
  } as ResolvedConfig;

  const normalized = userConfigSchema.parse({
    version: merged.version,
    profile: merged.profile,
    include: merged.include,
    exclude: merged.exclude,
    rules: merged.rules,
    failOn: merged.failOn,
    minSeverity: merged.minSeverity,
    maxFileSize: merged.maxFileSize,
    followSymlinks: merged.followSymlinks,
    respectGitignore: merged.respectGitignore,
    strictParse: merged.strictParse
  });

  return {
    ...merged,
    ...normalized,
    rootPath,
    include: normalized.include ?? merged.include,
    exclude: normalized.exclude ?? merged.exclude,
    onlyRules: merged.onlyRules ?? [],
    rules: normalized.rules ?? {},
    profile: normalized.profile ?? "recommended",
    failOn: normalized.failOn ?? "high",
    minSeverity: normalized.minSeverity ?? "low",
    maxFileSize: normalized.maxFileSize ?? defaultConfig.maxFileSize,
    followSymlinks: normalized.followSymlinks ?? false,
    respectGitignore: normalized.respectGitignore ?? true,
    strictParse: normalized.strictParse ?? false,
    color: parseColor(input.color)
  };
}

async function readConfigFile(rootPath: string, explicitPath?: string): Promise<UserConfig> {
  const candidates = explicitPath
    ? [path.resolve(rootPath, explicitPath)]
    : [path.join(rootPath, "agentrisk.config.json"), path.join(rootPath, ".agentrisk.json")];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      return userConfigSchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && !explicitPath) {
        continue;
      }
      throw new Error(`Invalid AgentRisk config at ${candidate}: ${(error as Error).message}`);
    }
  }

  return { version: 1 };
}

function parseStringEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

function buildRuleOverrides(rules?: string[], excludeRules?: string[]): NonNullable<UserConfig["rules"]> {
  const result: NonNullable<UserConfig["rules"]> = {};
  for (const rule of rules ?? []) {
    result[rule] = { enabled: true };
  }
  for (const rule of excludeRules ?? []) {
    result[rule] = "off";
  }
  return result;
}

function parseColor(value?: string): ResolvedConfig["color"] {
  if (value === "always" || value === "never" || value === "auto") {
    return value;
  }
  return "auto";
}
