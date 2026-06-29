import type { Command } from "commander";
import { runStdioMcpServer } from "../mcp/server.js";

export function registerMcpCommand(program: Command): void {
  const mcp = program
    .command("mcp")
    .description("Run AgentRisk as a local stdio MCP server")
    .action(async () => {
      await runStdioMcpServer();
    });

  mcp
    .command("config")
    .description("Print a copy-paste MCP client configuration snippet")
    .option("--server-name <name>", "MCP server name to use in the client config", "agentrisk")
    .option("--package <specifier>", "npm package specifier to run", "agentrisk@latest")
    .action((options: { serverName: string; package: string }) => {
      const config = {
        mcpServers: {
          [options.serverName]: {
            command: "npx",
            args: ["-y", options.package, "mcp"]
          }
        }
      };

      process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
    });
}
