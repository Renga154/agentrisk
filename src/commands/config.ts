import type { Command } from "commander";
import { loadConfig } from "../config/load-config.js";

export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("Inspect AgentRisk configuration");

  config
    .command("print")
    .description("Print resolved configuration")
    .argument("[path]", "workspace path", ".")
    .option("-c, --config <path>", "path to agentrisk config JSON")
    .action(async (targetPath, options) => {
      try {
        const resolved = await loadConfig({
          rootPath: targetPath,
          configPath: options.config
        });
        process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
      } catch (error) {
        process.stderr.write(`agentrisk config failed: ${(error as Error).message}\n`);
        process.exitCode = 2;
      }
    });
}

