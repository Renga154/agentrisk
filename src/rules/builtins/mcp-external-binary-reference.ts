import path from "node:path";
import type { McpConfigData } from "../../artifacts/types.js";
import { textLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const suspiciousExternalPath = /^\/(?:tmp|var\/tmp|private\/tmp|dev\/shm)\//;

export const mcpExternalBinaryReference: Rule = {
  id: "mcp-external-binary-reference",
  title: "MCP server references an external local executable",
  summary: "Flags absolute MCP command paths that live outside the scanned artifact.",
  defaultSeverity: "medium",
  tags: ["mcp", "provenance", "execution"],
  scope: "document",
  targetKinds: ["mcpConfig"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as McpConfigData;
      return data.servers.flatMap((server) => {
        const command = server.command;
        if (!command || !path.isAbsolute(command)) {
          return [];
        }

        const isTemp = suspiciousExternalPath.test(command);
        return [
          ctx.createFinding({
            ruleId: "mcp-external-binary-reference",
            artifact,
            severity: isTemp ? "high" : "medium",
            confidence: "medium",
            category: "supply-chain",
            message: `MCP server "${server.name}" launches an absolute executable path outside the scanned artifact.`,
            description: "Absolute local binaries are not captured by repository or package review and may differ across machines.",
            help: "Prefer checked-in wrapper scripts, pinned package references, or documented installation with checksums.",
            location: textLocation(artifact, command),
            evidence: [
              { kind: "serverName", value: server.name },
              { kind: "text", value: command },
              { kind: "jsonPointer", value: server.jsonPointer }
            ],
            tags: ["mcp", "provenance"]
          })
        ];
      });
    });
  }
};
