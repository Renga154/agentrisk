import type { McpConfigData } from "../../artifacts/types.js";
import { combinedCommand, regexLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const runnerPattern = /\b(?:npx|pnpm\s+dlx|yarn\s+dlx|bunx|uvx|pipx\s+run|go\s+run|cargo\s+install|docker\s+run)\b/i;

export const mcpUnpinnedDlx: Rule = {
  id: "mcp-unpinned-dlx",
  title: "MCP server uses an unpinned package or image runner",
  summary: "Flags package, language, and container launchers without an obvious version pin.",
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
            message: `MCP server "${server.name}" uses a launcher without an obvious version pin.`,
            description: "Floating package, source, or container resolution makes the executable change outside code review.",
            help: "Pin package, git, or image versions in MCP launch commands, for example `some-server@1.2.3` or `image@sha256:<digest>`.",
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
  if (/\bsha256:[a-f0-9]{32,}\b/i.test(commandLine)) {
    return true;
  }
  return tokens.some((token) => {
    if (token.startsWith("-")) {
      return false;
    }
    if (token.startsWith("@")) {
      return /^@[^/]+\/[^@\s]+@\d+\.\d+\.\d+/.test(token);
    }
    return /@(?:v?\d+\.\d+\.\d+|sha[0-9a-f]+[0-9a-f]*|[0-9a-f]{7,40})$/i.test(token) || /:[\w.-]+\d[\w.-]*$/.test(token);
  });
}
