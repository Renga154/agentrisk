import { z } from "zod";
import { severitySchema } from "../config/schema.js";

export const reportSchema = z.object({
  schemaVersion: z.literal(1),
  tool: z.object({
    name: z.string(),
    version: z.string()
  }),
  scannedAt: z.string(),
  rootPath: z.string(),
  profile: z.enum(["recommended", "strict"]),
  summary: z.object({
    totalFindings: z.number(),
    bySeverity: z.record(severitySchema, z.number()),
    filesScanned: z.number(),
    filesMatched: z.number(),
    parseErrors: z.number()
  }),
  findings: z.array(
    z.object({
      id: z.string(),
      ruleId: z.string(),
      severity: severitySchema,
      confidence: z.enum(["low", "medium", "high"]),
      category: z.enum(["execution", "instructions", "exfiltration", "trust", "policy", "supply-chain"]),
      message: z.string(),
      description: z.string().optional(),
      help: z.string().optional(),
      locations: z.array(
        z.object({
          path: z.string(),
          line: z.number().optional(),
          column: z.number().optional(),
          endLine: z.number().optional(),
          endColumn: z.number().optional()
        })
      ),
      evidence: z.array(
        z.object({
          kind: z.enum(["text", "jsonPointer", "scriptName", "serverName"]),
          value: z.string()
        })
      ),
      fingerprints: z.object({
        primary: z.string()
      }),
      tags: z.array(z.string())
    })
  ),
  diagnostics: z.array(
    z.object({
      kind: z.enum(["parse_error", "read_error", "config_error", "skipped_file"]),
      message: z.string(),
      path: z.string().optional()
    })
  ),
  stats: z.object({
    filesDiscovered: z.number(),
    bytesScanned: z.number(),
    rulesEvaluated: z.number()
  })
});

