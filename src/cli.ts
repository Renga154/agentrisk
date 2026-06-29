#!/usr/bin/env node
import { Command } from "commander";
import { registerConfigCommand } from "./commands/config.js";
import { registerMcpCommand } from "./commands/mcp.js";
import { registerRulesCommand } from "./commands/rules.js";
import { registerScanCommand } from "./commands/scan.js";
import { registerSchemaCommand } from "./commands/schema.js";
import { VERSION } from "./version.js";

const program = new Command();

program
  .name("agentrisk")
  .description("Zero-execution preflight scanner for AI-agent and MCP workspace risk")
  .version(VERSION);

registerScanCommand(program);
registerRulesCommand(program);
registerConfigCommand(program);
registerSchemaCommand(program);
registerMcpCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`agentrisk failed: ${(error as Error).message}\n`);
  process.exitCode = 3;
});
