import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const cases = [
  ...(await collectCases("corpus/benign", "benign")),
  ...(await collectCases("corpus/malicious", "malicious"))
];

const rows = [];
for (const testCase of cases) {
  const output = path.join(".tmp", "corpus", `${testCase.kind}-${testCase.name}.json`);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const result = spawnSync(process.execPath, ["dist/cli.cjs", "scan", testCase.path, "--format", "json", "--output", output], {
    cwd: root,
    encoding: "utf8"
  });
  const report = JSON.parse(await fs.readFile(output, "utf8"));
  rows.push({
    ...testCase,
    exitCode: result.status ?? 0,
    verdict: report.risk.verdict,
    findings: report.summary.totalFindings,
    critical: report.summary.bySeverity.critical,
    high: report.summary.bySeverity.high,
    medium: report.summary.bySeverity.medium,
    rules: [...new Set(report.findings.map((finding) => finding.ruleId))].sort()
  });
}

const markdown = renderMarkdown(rows);
await fs.mkdir("docs", { recursive: true });
await fs.writeFile("docs/corpus-report.md", markdown, "utf8");
process.stdout.write(markdown);

async function collectCases(directory, kind) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      kind,
      name: entry.name,
      path: path.join(directory, entry.name)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderMarkdown(rows) {
  const benign = rows.filter((row) => row.kind === "benign");
  const malicious = rows.filter((row) => row.kind === "malicious");
  const detectedMalicious = malicious.filter((row) => row.findings > 0).length;
  const cleanBenign = benign.filter((row) => row.findings === 0).length;
  const lines = [
    "# AgentRisk Corpus Report",
    "",
    "This report is generated from the checked-in corpus with `npm run corpus:evaluate`.",
    "",
    `- Benign cases clean: ${cleanBenign}/${benign.length}`,
    `- Malicious cases detected: ${detectedMalicious}/${malicious.length}`,
    "",
    "| Case | Expected | Verdict | Findings | Top rules |",
    "| --- | --- | --- | ---: | --- |"
  ];

  for (const row of rows) {
    lines.push(
      `| \`${row.name}\` | ${row.kind} | ${row.verdict} | ${row.findings} | ${row.rules.map((rule) => `\`${rule}\``).join(", ") || "-"} |`
    );
  }

  lines.push(
    "",
    "The corpus is intentionally small and reviewable. It is not a benchmark claim; it is a regression and demo set for deterministic preflight behavior.",
    ""
  );

  return `${lines.join("\n")}`;
}

