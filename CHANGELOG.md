# Changelog

## 0.2.2

- Fixed `action.yml` being invalid YAML (unquoted colon in the `format` input description), which broke the GitHub Action for all published tags.
- Hardened the GitHub Action by passing inputs to the shell via environment variables instead of inline `${{ }}` expansion.
- Fixed an operator-precedence bug in the `mcp-remote-fetch-exec` rule: benign command lines containing `requests` or `get(` were flagged as critical, while unquoted `python -c` download-and-exec one-liners were missed.
- `--include` / `--exclude` globs now extend the default file sets instead of silently replacing them, matching the documented "additional glob" behavior.
- Unknown rule ids passed to `--rule` / `--exclude-rule` now fail with exit code 2 instead of silently disabling every rule and passing.

## 0.2.1

- Added `agentrisk mcp config` to print copy-paste MCP client configuration JSON.
- Improved quick-start documentation for first-time CLI and MCP users.

## 0.2.0

- Added a local stdio MCP server with the `agentrisk_scan` tool.
- Added `agentrisk mcp` and `agentrisk-mcp` entry points for LLM client integration.
- Refactored scan execution so CLI and MCP calls share the same zero-execution scan path.

## 0.1.0

- Initial zero-execution AI-agent workspace scanner.
- Added MCP, package lifecycle, agent instruction, and cross-file policy rules.
- Added Terminal, JSON, Markdown, and SARIF output.
- Added config and report schemas.
