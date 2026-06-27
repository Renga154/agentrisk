import type { Command } from "commander";
import { builtinRules, getRuleById } from "../rules/registry.js";

export function registerRulesCommand(program: Command): void {
  const rules = program.command("rules").description("Inspect built-in AgentRisk rules");

  rules
    .command("list")
    .description("List built-in rules")
    .option("-f, --format <format>", "terminal or json", "terminal")
    .action((options) => {
      const payload = builtinRules.map((rule) => ({
        id: rule.id,
        title: rule.title,
        defaultSeverity: rule.defaultSeverity,
        scope: rule.scope,
        targetKinds: rule.targetKinds,
        tags: rule.tags
      }));

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return;
      }

      for (const rule of payload) {
        process.stdout.write(`${rule.id}  ${rule.defaultSeverity}  ${rule.title}\n`);
      }
    });

  rules
    .command("show")
    .description("Show one built-in rule")
    .argument("<ruleId>")
    .option("-f, --format <format>", "terminal or json", "terminal")
    .action((ruleId, options) => {
      const rule = getRuleById(ruleId);
      if (!rule) {
        process.stderr.write(`Unknown rule: ${ruleId}\n`);
        process.exitCode = 2;
        return;
      }

      const payload = {
        id: rule.id,
        title: rule.title,
        summary: rule.summary,
        defaultSeverity: rule.defaultSeverity,
        scope: rule.scope,
        targetKinds: rule.targetKinds,
        tags: rule.tags
      };

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${payload.id}\n`);
      process.stdout.write(`${payload.title}\n\n`);
      process.stdout.write(`${payload.summary}\n\n`);
      process.stdout.write(`Severity: ${payload.defaultSeverity}\n`);
      process.stdout.write(`Scope: ${payload.scope}\n`);
      process.stdout.write(`Targets: ${payload.targetKinds.join(", ")}\n`);
      process.stdout.write(`Tags: ${payload.tags.join(", ")}\n`);
    });
}
