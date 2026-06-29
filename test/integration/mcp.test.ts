import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("MCP server", () => {
  it("exposes agentrisk_scan and scans through MCP stdio", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "src/cli.ts", "mcp"],
      cwd: process.cwd(),
      stderr: "pipe"
    });
    const client = new Client({ name: "agentrisk-test", version: "0.0.0" });

    try {
      await client.connect(transport);

      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("agentrisk_scan");

      const result = await client.callTool({
        name: "agentrisk_scan",
        arguments: {
          target: "test/fixtures/risky-mcp",
          minSeverity: "critical",
          failOn: "critical",
          maxFindings: 5
        }
      });

      expect("content" in result).toBe(true);
      if (!("content" in result)) {
        throw new Error("Expected regular tool content response");
      }

      const content = result.content as Array<{ type: string; text?: string }>;
      const text = content.find((entry) => entry.type === "text")?.text;
      expect(text).toContain("AgentRisk scan completed");
      expect(text).toContain("Verdict: block");

      const structured = result.structuredContent as {
        report: {
          risk: { verdict: string };
          summary: { bySeverity: { critical: number } };
        };
      };
      expect(structured.report.risk.verdict).toBe("block");
      expect(structured.report.summary.bySeverity.critical).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  });
});
