import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Finding, ScanResult } from "../artifacts/types.js";
import { runScan } from "../engine/run-scan.js";
import { TOOL_NAME, VERSION } from "../version.js";

const severitySchema = z.enum(["low", "medium", "high", "critical"]);

const scanToolInputSchema = {
  target: z
    .string()
    .default(".")
    .describe("Target to scan: local path, github:owner/repo[#ref], GitHub URL, npm:<package>[@version], or a local/remote .tgz/.tar.gz archive."),
  profile: z.enum(["recommended", "strict"]).default("recommended").describe("Rule profile to use."),
  minSeverity: severitySchema.default("low").describe("Only include findings at or above this severity in the returned report."),
  failOn: severitySchema.default("high").describe("Mark the scan as failing when any finding reaches this severity."),
  githubRef: z.string().optional().describe("Git ref to use when scanning GitHub targets."),
  rule: z.array(z.string()).optional().describe("Run only these rule ids."),
  excludeRule: z.array(z.string()).optional().describe("Disable these rule ids."),
  include: z.array(z.string()).optional().describe("Additional include globs."),
  exclude: z.array(z.string()).optional().describe("Additional exclude globs."),
  maxFileSize: z.number().int().positive().optional().describe("Skip files larger than this size in bytes."),
  maxDownloadSize: z.number().int().positive().default(50_000_000).describe("Maximum bytes to download for remote, GitHub, npm, or archive targets."),
  respectGitignore: z.boolean().default(false).describe("Apply the target .gitignore during discovery. Off by default so high-signal files cannot be hidden."),
  followSymlinks: z.boolean().default(false).describe("Follow symlinks during discovery."),
  strictParse: z.boolean().default(false).describe("Drop malformed JSON artifacts from rule evaluation instead of keeping best-effort diagnostics."),
  keepTemp: z.boolean().default(false).describe("Keep extracted temporary target directories for debugging."),
  reportFormat: z.enum(["markdown", "json", "sarif"]).default("markdown").describe("Rendered report format to include when includeReportText is true."),
  maxFindings: z.number().int().min(1).max(200).default(50).describe("Maximum findings to summarize in the text response."),
  includeReportText: z.boolean().default(false).describe("Append the rendered report text to the response. The full structured report is always returned.")
};

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: TOOL_NAME,
      version: VERSION
    },
    {
      instructions:
        "AgentRisk statically scans untrusted AI-agent workspaces, MCP configs, instruction files, npm packages, GitHub repos, and archives before an LLM agent executes or trusts them. It never runs target code and never connects to target MCP servers."
    }
  );

  server.registerTool(
    "agentrisk_scan",
    {
      title: "Scan AI-agent artifact risk",
      description:
        "Zero-execution preflight scanner for untrusted AI-agent and MCP artifacts. Use before opening a repo with a coding agent, trusting MCP config, or installing agent-related packages.",
      inputSchema: scanToolInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args): Promise<CallToolResult> => {
      try {
        const scan = await runScan({
          target: args.target,
          profile: args.profile,
          minSeverity: args.minSeverity,
          failOn: args.failOn,
          githubRef: args.githubRef,
          rules: args.rule,
          excludeRules: args.excludeRule,
          include: args.include,
          exclude: args.exclude,
          maxFileSize: args.maxFileSize,
          maxDownloadSize: args.maxDownloadSize,
          respectGitignore: args.respectGitignore,
          followSymlinks: args.followSymlinks,
          strictParse: args.strictParse,
          keepTemp: args.keepTemp,
          format: args.reportFormat,
          color: "never"
        });

        const text = buildToolText(scan.filteredResult, {
          rendered: scan.rendered,
          includeReportText: args.includeReportText,
          maxFindings: args.maxFindings
        });

        return {
          content: [{ type: "text", text }],
          structuredContent: {
            ok: !scan.shouldFail,
            exitCode: scan.exitCode,
            shouldFail: scan.shouldFail,
            renderedFormat: scan.format,
            findingsTotal: scan.filteredResult.summary.totalFindings,
            findingsSummarized: Math.min(scan.filteredResult.findings.length, args.maxFindings),
            report: scan.filteredResult
          }
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `AgentRisk scan failed: ${(error as Error).message}`
            }
          ],
          structuredContent: {
            ok: false,
            error: (error as Error).message
          }
        };
      }
    }
  );

  return server;
}

export async function runStdioMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function buildToolText(
  result: ScanResult,
  options: {
    rendered: string;
    includeReportText: boolean;
    maxFindings: number;
  }
): string {
  const lines = [
    "AgentRisk scan completed.",
    "",
    `Verdict: ${result.risk.verdict}`,
    `Findings: ${result.summary.totalFindings} total (critical ${result.summary.bySeverity.critical}, high ${result.summary.bySeverity.high}, medium ${result.summary.bySeverity.medium}, low ${result.summary.bySeverity.low})`,
    `Source: ${result.source.kind} ${result.source.input}${result.source.note ? ` (${result.source.note})` : ""}`,
    `Files scanned: ${result.summary.filesScanned}`,
    `Incomplete: ${result.summary.incomplete ? "yes" : "no"}`,
    ""
  ];

  if (result.risk.reasons.length > 0) {
    lines.push("Reasons:");
    for (const reason of result.risk.reasons) {
      lines.push(`- ${reason}`);
    }
    lines.push("");
  }

  if (result.findings.length === 0) {
    lines.push(result.summary.incomplete ? "No findings at the selected severity, but diagnostics require review." : "No findings at the selected severity.");
  } else {
    const summarized = result.findings.slice(0, options.maxFindings);
    lines.push(`Findings shown: ${summarized.length} of ${result.findings.length}`);
    for (const finding of summarized) {
      lines.push(formatFinding(finding));
    }
    if (summarized.length < result.findings.length) {
      lines.push("");
      lines.push(`Additional findings were omitted from the text response. Increase maxFindings or inspect structuredContent.report for the full report.`);
    }
  }

  if (result.diagnostics.length > 0) {
    lines.push("");
    lines.push("Diagnostics:");
    for (const diagnostic of result.diagnostics.slice(0, 20)) {
      lines.push(`- ${diagnostic.kind}${diagnostic.path ? ` ${diagnostic.path}` : ""}: ${diagnostic.message}`);
    }
    if (result.diagnostics.length > 20) {
      lines.push(`- ${result.diagnostics.length - 20} additional diagnostics omitted from text response.`);
    }
  }

  if (options.includeReportText) {
    lines.push("");
    lines.push("Rendered report:");
    lines.push("");
    lines.push(options.rendered.trimEnd());
  }

  return `${lines.join("\n")}\n`;
}

function formatFinding(finding: Finding): string {
  const location = finding.locations[0];
  const locationText = location ? `${location.path}${location.line ? `:${location.line}` : ""}` : "unknown location";
  const evidence = finding.evidence.find((entry) => entry.kind === "text") ?? finding.evidence[0];
  return [
    "",
    `- [${finding.severity.toUpperCase()}] ${finding.ruleId}`,
    `  Location: ${locationText}`,
    `  Message: ${finding.message}`,
    finding.help ? `  Help: ${finding.help}` : undefined,
    evidence ? `  Evidence: ${evidence.value}` : undefined
  ]
    .filter(Boolean)
    .join("\n");
}
