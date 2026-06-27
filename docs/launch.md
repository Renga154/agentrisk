# AgentRisk Launch Notes

## Positioning

AgentRisk is a zero-execution preflight scanner for AI-agent workspaces. It catches risky MCP config, agent instructions, and package lifecycle scripts before a coding agent or MCP server runs them.

## Short Announcement

AI coding agents now read repo instructions and launch tools from local config. That makes files like `.mcp.json`, `AGENTS.md`, Cursor rules, and `package.json` part of your agent supply chain.

AgentRisk scans those files without executing anything and emits Terminal, JSON, Markdown, or SARIF reports:

```bash
npx agentrisk scan .
```

It currently flags remote fetch-and-exec MCP servers, shell-wrapper launches, unpinned package runners, secret env forwarding, prompt-injection-style repo instructions, approval bypasses, and risky install scripts.

## Hacker News Title

Show HN: AgentRisk, a zero-execution scanner for AI-agent and MCP workspace risk

## First Comment

I built AgentRisk because many AI-agent security checks start after tools are already installed or connected. This one is intentionally boring: it statically reads high-signal workspace files, never runs target code, and produces evidence-backed findings plus SARIF for GitHub code scanning.

The first rule pack focuses on MCP launch commands, package lifecycle scripts, and instruction files like `AGENTS.md`, `CLAUDE.md`, Cursor rules, and Copilot instructions.

## Demo Script

```bash
git clone https://github.com/satourenware/agentrisk
cd agentrisk
npm install
npm run build
node dist/cli.js scan examples/risky-workspace
node dist/cli.js scan examples/risky-workspace --format sarif --output agentrisk.sarif
```

## Launch Checklist

- Publish GitHub repository as `satourenware/agentrisk`.
- Add repository description: `Zero-execution preflight scanner for AI-agent and MCP workspace risk`.
- Enable private vulnerability reporting.
- Create initial release `v0.1.0`.
- Publish package name `agentrisk` to npm.
- Pin README demo output screenshot or GIF.
- Post launch note with exact command and one real finding screenshot.

