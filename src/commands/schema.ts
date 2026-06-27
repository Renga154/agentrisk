import type { Command } from "commander";
import { zodToJsonSchema } from "zod-to-json-schema";
import { userConfigSchema } from "../config/schema.js";
import { reportSchema } from "../schemas/report.js";

export function registerSchemaCommand(program: Command): void {
  const schema = program.command("schema").description("Print AgentRisk JSON schemas");

  schema
    .command("config")
    .description("Print the configuration JSON Schema")
    .action(() => {
      process.stdout.write(`${JSON.stringify(zodToJsonSchema(userConfigSchema, "AgentRiskConfig"), null, 2)}\n`);
    });

  schema
    .command("report")
    .description("Print the report JSON Schema")
    .action(() => {
      process.stdout.write(`${JSON.stringify(zodToJsonSchema(reportSchema, "AgentRiskReport"), null, 2)}\n`);
    });
}

