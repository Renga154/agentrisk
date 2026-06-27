import type { McpConfigData } from "../../artifacts/types.js";
import { combinedCommand, regexLocation } from "../helpers.js";
import type { Rule } from "../types.js";

const privilegedDockerPattern = /\bdocker\s+run\b[\s\S]{0,240}(?:--privileged|--cap-add\s+SYS_ADMIN|-v\s+\/:|--volume\s+\/:|-v\s+\/var\/run\/docker\.sock|--volume\s+\/var\/run\/docker\.sock)/i;

export const mcpPrivilegedContainer: Rule = {
  id: "mcp-privileged-container",
  title: "MCP server launches a privileged container",
  summary: "Flags Docker MCP launch commands with host-level privileges or sensitive mounts.",
  defaultSeverity: "critical",
  tags: ["mcp", "container", "execution"],
  scope: "document",
  targetKinds: ["mcpConfig"],
  evaluate(ctx, artifacts) {
    return artifacts.flatMap((artifact) => {
      const data = artifact.data as McpConfigData;
      return data.servers.flatMap((server) => {
        const commandLine = combinedCommand(server.command, server.args);
        if (!privilegedDockerPattern.test(commandLine)) {
          return [];
        }

        return [
          ctx.createFinding({
            ruleId: "mcp-privileged-container",
            artifact,
            severity: "critical",
            confidence: "high",
            category: "execution",
            message: `MCP server "${server.name}" launches a container with host-level privileges.`,
            description: "Privileged containers and host or Docker socket mounts can give an MCP server broad control over the host.",
            help: "Avoid privileged containers for MCP servers. Remove host root and Docker socket mounts, and run the server with the least required permissions.",
            location: regexLocation(artifact, privilegedDockerPattern),
            evidence: [
              { kind: "serverName", value: server.name },
              { kind: "text", value: commandLine },
              { kind: "jsonPointer", value: server.jsonPointer }
            ],
            tags: ["mcp", "container", "privileged"]
          })
        ];
      });
    });
  }
};

