import { z } from "zod";
import { severities } from "../shared/severity.js";

export const profileSchema = z.enum(["recommended", "strict"]);
export const severitySchema = z.enum(severities as ["low", "medium", "high", "critical"]);

export const ruleOverrideSchema = z.union([
  z.literal("off"),
  severitySchema,
  z.object({
    enabled: z.boolean().default(true),
    level: severitySchema.optional()
  })
]);

export const userConfigSchema = z.object({
  version: z.literal(1).default(1),
  profile: profileSchema.optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  rules: z.record(ruleOverrideSchema).optional(),
  failOn: severitySchema.optional(),
  minSeverity: severitySchema.optional(),
  maxFileSize: z.number().int().positive().optional(),
  followSymlinks: z.boolean().optional(),
  respectGitignore: z.boolean().optional(),
  strictParse: z.boolean().optional()
});

export type UserConfig = z.infer<typeof userConfigSchema>;

export interface ResolvedConfig {
  version: 1;
  rootPath: string;
  profile: "recommended" | "strict";
  include: string[];
  exclude: string[];
  onlyRules: string[];
  rules: NonNullable<UserConfig["rules"]>;
  failOn: "low" | "medium" | "high" | "critical";
  minSeverity: "low" | "medium" | "high" | "critical";
  maxFileSize: number;
  followSymlinks: boolean;
  respectGitignore: boolean;
  strictParse: boolean;
  color: "auto" | "always" | "never";
}
