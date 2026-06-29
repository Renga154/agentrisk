import type { Command } from "commander";
import { runStdioMcpServer } from "../mcp/server.js";

export function registerMcpCommand(program: Command): void {
  program
    .command("mcp")
    .description("Run AgentRisk as a local stdio MCP server")
    .action(async () => {
      await runStdioMcpServer();
    });
}
