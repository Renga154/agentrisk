#!/usr/bin/env node
import { runStdioMcpServer } from "./mcp/server.js";

runStdioMcpServer().catch((error: unknown) => {
  process.stderr.write(`agentrisk mcp failed: ${(error as Error).message}\n`);
  process.exitCode = 3;
});
