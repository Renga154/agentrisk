import fs from "node:fs/promises";
import type { Command } from "commander";
import { isUsageOrConfigError, runScan } from "../engine/run-scan.js";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Scan an AI-agent workspace without executing target code")
    .argument("[path]", "workspace path to scan", ".")
    .option("-c, --config <path>", "path to agentrisk config JSON")
    .option("--profile <profile>", "rule profile: recommended or strict")
    .option("--rule <id>", "run only this rule id; repeatable", collect, [])
    .option("--exclude-rule <id>", "disable a rule id", collect, [])
    .option("--include <glob>", "additional include glob", collect, [])
    .option("--exclude <glob>", "additional exclude glob", collect, [])
    .option("-f, --format <format>", "terminal, json, sarif, markdown, or auto", "auto")
    .option("-o, --output <path>", "write report to a file")
    .option("--fail-on <severity>", "exit 1 when findings are at least this severity", "high")
    .option("--min-severity <severity>", "only render findings at least this severity", "low")
    .option("--max-file-size <bytes>", "skip files larger than this size in bytes")
    .option("--max-download-size <bytes>", "maximum bytes to download for remote, GitHub, npm, or archive targets", "50000000")
    .option("--github-ref <ref>", "Git ref to use for GitHub targets")
    .option("--keep-temp", "keep extracted temporary target directories for debugging")
    .option("--gitignore", "apply target .gitignore during discovery (off by default)")
    .option("--follow-symlinks", "follow symlinks during discovery")
    .option("--strict-parse", "drop malformed JSON artifacts from rule evaluation")
    .option("--color <mode>", "auto, always, or never", "auto")
    .action(async (targetPath: string, options) => {
      try {
        const scan = await runScan({
          target: targetPath,
          configPath: options.config,
          profile: options.profile,
          include: options.include,
          exclude: options.exclude,
          rules: options.rule,
          excludeRules: options.excludeRule,
          format: options.format,
          output: options.output,
          failOn: options.failOn,
          minSeverity: options.minSeverity,
          maxFileSize: options.maxFileSize,
          maxDownloadSize: options.maxDownloadSize,
          githubRef: options.githubRef,
          keepTemp: options.keepTemp,
          respectGitignore: options.gitignore === true,
          followSymlinks: options.followSymlinks,
          strictParse: options.strictParse,
          color: options.color
        });

        if (options.output) {
          await fs.writeFile(options.output, scan.rendered, "utf8");
          process.stderr.write(`AgentRisk wrote ${scan.format} report to ${options.output}\n`);
        } else {
          process.stdout.write(scan.rendered);
        }

        process.exitCode = scan.exitCode;
      } catch (error) {
        process.stderr.write(`agentrisk scan failed: ${(error as Error).message}\n`);
        process.exitCode = isUsageOrConfigError(error) ? 2 : 3;
      }
    });
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}
