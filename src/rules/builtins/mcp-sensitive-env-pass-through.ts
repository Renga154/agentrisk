import type { McpConfigData } from "../../artifacts/types.js";
import { textLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const sensitiveNamePattern = /(?:token|secret|password|passwd|api[_-]?key|private[_-]?key|credential|session|cookie|github_pat|openai_api_key)/i;
const broadEnvPattern = /^(?:\*|all|process\.env|\$\{?env\}?|inherit)$/i;

export const mcpSensitiveEnvPassThrough: Rule = {
  id: "mcp-sensitive-env-pass-through",
  title: "MCP server receives sensitive environment variables",
  summary: "Flags broad or sensitive environment forwarding into MCP server processes.",
  defaultSeverity: "high",
  tags: ["mcp", "secrets", "exfiltration"],
  scope: "document",
  targetKinds: ["mcpConfig"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as McpConfigData;
      return data.servers.flatMap((server) => {
        const findings = [];
        for (const [key, rawValue] of Object.entries(server.env)) {
          const value = typeof rawValue === "string" ? rawValue : String(rawValue);
          const isSensitiveName = sensitiveNamePattern.test(key);
          const isBroad = broadEnvPattern.test(value) || broadEnvPattern.test(key);
          const valueMentionsSensitive = sensitiveNamePattern.test(value);
          if (!isSensitiveName && !isBroad && !valueMentionsSensitive) {
            continue;
          }

          findings.push(
            ctx.createFinding({
              ruleId: "mcp-sensitive-env-pass-through",
              artifact,
              severity: isBroad ? "critical" : "high",
              confidence: isBroad || isSensitiveName ? "high" : "medium",
              category: "exfiltration",
              message: `MCP server "${server.name}" receives sensitive-looking environment value "${key}".`,
              description: "MCP servers can access environment values they are given; broad or secret-bearing env forwarding increases blast radius.",
              help: "Pass only the minimum environment variables required by the server. Prefer scoped tokens and avoid forwarding entire process environments.",
              location: textLocation(artifact, key),
              evidence: [
                { kind: "serverName", value: server.name },
                { kind: "text", value: `${key}=${redact(value)}` },
                { kind: "jsonPointer", value: `${server.jsonPointer}/env/${key}` }
              ],
              tags: ["mcp", "secrets"]
            })
          );
        }
        return findings;
      });
    });
  }
};

function redact(value: string): string {
  if (value.length <= 8) {
    return "<redacted>";
  }
  return `${value.slice(0, 3)}...${value.slice(-2)}`;
}

