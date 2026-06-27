# AgentRisk Launch Notes

## Positioning

AgentRisk is a zero-execution preflight scanner for untrusted AI-agent artifacts. It catches risky MCP config, agent instructions, skills, package lifecycle scripts, and launch-chain provenance issues before a coding agent or MCP server runs them.

## Short Announcement

AI coding agents now read repo instructions and launch tools from local config. That makes files like `.mcp.json`, `AGENTS.md`, `SKILL.md`, Cursor rules, and `package.json` part of your agent supply chain.

AgentRisk scans local folders, GitHub URLs, npm packages, and tarballs without executing target code and emits Terminal, JSON, Markdown, or SARIF reports:

```bash
npx agentrisk scan https://github.com/owner/suspicious-agent-repo
npx agentrisk scan npm:some-mcp-server@1.2.3
```

It currently flags remote fetch-and-exec MCP servers, privileged Docker launches, shell-wrapper launches, unpinned package/image runners, secret env forwarding, external binary references, prompt-injection-style repo instructions, approval bypasses, and risky install scripts.

## Hacker News Title

Show HN: AgentRisk, a zero-execution preflight scanner for untrusted AI-agent artifacts

## First Comment

I built AgentRisk because many AI-agent security checks start after tools are already installed, connected, or cloned into an agent workflow. This one is intentionally boring: it downloads/extracts only when you explicitly pass a remote target, statically reads high-signal files, never runs target code, and produces evidence-backed findings plus SARIF for GitHub code scanning.

The first rule pack focuses on MCP launch commands, package lifecycle scripts, skills, and instruction files like `AGENTS.md`, `CLAUDE.md`, Cursor rules, and Copilot instructions.

## Demo Script

```bash
git clone https://github.com/Renga154/agentrisk
cd agentrisk
npm install
npm run build
node dist/cli.cjs scan examples/risky-workspace
node dist/cli.cjs scan examples/risky-workspace --format sarif --output agentrisk.sarif
node dist/cli.cjs scan npm:is-number@7.0.0 --format json
```

## Launch Checklist

- Publish GitHub repository as `Renga154/agentrisk`.
- Add repository description: `Zero-execution preflight scanner for AI-agent and MCP workspace risk`.
- Enable private vulnerability reporting.
- Create initial release `v0.1.0`.
- Publish package name `agentrisk` to npm.
- Pin README demo output screenshot or GIF.
- Post launch note with exact command and one real finding screenshot.
