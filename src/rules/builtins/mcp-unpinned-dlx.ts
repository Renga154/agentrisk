import type { McpConfigData } from "../../artifacts/types.js";
import { combinedCommand, regexLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const runnerPattern = /\b(?:npx|pnpm\s+dlx|yarn\s+dlx|bunx)\b/i;

export const mcpUnpinnedDlx: Rule = {
  id: "mcp-unpinned-dlx",
  title: "MCP server uses an unpinned package runner",
  summary: "Flags npx/pnpm dlx/yarn dlx/bunx launchers without an obvious version pin.",
  defaultSeverity: "medium",
  tags: ["mcp", "supply-chain"],
  scope: "document",
  targetKinds: ["mcpConfig"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as McpConfigData;
      return data.servers.flatMap((server) => {
        const commandLine = combinedCommand(server.command, server.args);
        if (!runnerPattern.test(commandLine) || hasPinnedPackageReference(commandLine)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "mcp-unpinned-dlx",
            artifact,
            severity: "medium",
            confidence: "medium",
            category: "supply-chain",
            message: `MCP server "${server.name}" uses a package runner without an obvious version pin.`,
            description: "Floating package resolution makes the executable change outside code review.",
            help: "Pin package versions in MCP launch commands, for example `some-server@1.2.3`, and consider lockfile-backed installs for shared environments.",
            location: regexLocation(artifact, runnerPattern),
            evidence: [
              { kind: "serverName", value: server.name },
              { kind: "text", value: commandLine },
              { kind: "jsonPointer", value: server.jsonPointer }
            ],
            tags: ["mcp", "pinning"]
          })
        ];
      });
    });
  }
};

function hasPinnedPackageReference(commandLine: string): boolean {
  const tokens = commandLine.split(/\s+/).filter(Boolean);
  return tokens.some((token) => {
    if (token.startsWith("-")) {
      return false;
    }
    if (token.startsWith("@")) {
      return /^@[^/]+\/[^@\s]+@\d+\.\d+\.\d+/.test(token);
    }
    return /@(?:\d+\.\d+\.\d+|sha[0-9a-f]+|[0-9a-f]{7,40})$/i.test(token);
  });
}

