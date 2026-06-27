import type { McpConfigData } from "../../artifacts/types.js";
import { combinedCommand, regexLocation, textLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const shellWrapperPattern = /\b(?:sh|bash|zsh|fish|cmd(?:\.exe)?|powershell|pwsh)\b\s+(?:-c|\/c|-Command|\/command)\b/i;

export const mcpShellWrapperCommand: Rule = {
  id: "mcp-shell-wrapper-command",
  title: "MCP server launches through a shell wrapper",
  summary: "Flags MCP server definitions that hide execution behind shell command strings.",
  defaultSeverity: "high",
  tags: ["mcp", "execution", "zero-exec"],
  scope: "document",
  targetKinds: ["mcpConfig"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as McpConfigData;
      return data.servers.flatMap((server) => {
        const commandLine = combinedCommand(server.command, server.args);
        if (!shellWrapperPattern.test(commandLine)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "mcp-shell-wrapper-command",
            artifact,
            severity: "high",
            confidence: "high",
            category: "execution",
            message: `MCP server "${server.name}" launches through a shell wrapper.`,
            description: "Shell wrappers make it harder to review the executable boundary and can hide chained commands.",
            help: "Prefer a direct executable with explicit arguments. Avoid `sh -c`, `bash -c`, `cmd /c`, and PowerShell command strings in MCP server config.",
            location: regexLocation(artifact, shellWrapperPattern) ?? (server.command ? textLocation(artifact, server.command) : undefined),
            evidence: [
              { kind: "serverName", value: server.name },
              { kind: "text", value: commandLine },
              { kind: "jsonPointer", value: server.jsonPointer }
            ],
            tags: ["mcp", "execution"]
          })
        ];
      });
    });
  }
};
