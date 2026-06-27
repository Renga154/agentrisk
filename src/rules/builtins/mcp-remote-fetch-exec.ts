import type { McpConfigData } from "../../artifacts/types.js";
import { combinedCommand, regexLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const remoteExecPatterns = [
  /\b(?:curl|wget)\b[\s\S]{0,160}\|\s*(?:sh|bash|zsh|fish)\b/i,
  /\b(?:iwr|irm|invoke-webrequest|invoke-restmethod)\b[\s\S]{0,200}\|\s*(?:iex|invoke-expression)\b/i,
  /\bpython(?:3)?\b\s+-c\s+["'][\s\S]{0,120}\burllib|requests|get\(/i
];

export const mcpRemoteFetchExec: Rule = {
  id: "mcp-remote-fetch-exec",
  title: "MCP server fetches remote code for execution",
  summary: "Flags command lines that download and execute code in one step.",
  defaultSeverity: "critical",
  tags: ["mcp", "execution", "supply-chain"],
  scope: "document",
  targetKinds: ["mcpConfig"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as McpConfigData;
      return data.servers.flatMap((server) => {
        const commandLine = combinedCommand(server.command, server.args);
        const pattern = remoteExecPatterns.find((candidate) => candidate.test(commandLine));
        if (!pattern) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "mcp-remote-fetch-exec",
            artifact,
            severity: "critical",
            confidence: "high",
            category: "supply-chain",
            message: `MCP server "${server.name}" appears to download and execute remote code.`,
            description: "Remote bootstrap commands are difficult to audit and can change after review.",
            help: "Pin a reviewed package or binary and avoid curl-to-shell, wget-to-shell, or PowerShell Invoke-Expression bootstraps.",
            location: regexLocation(artifact, pattern),
            evidence: [
              { kind: "serverName", value: server.name },
              { kind: "text", value: commandLine },
              { kind: "jsonPointer", value: server.jsonPointer }
            ],
            tags: ["mcp", "remote-exec"]
          })
        ];
      });
    });
  }
};

