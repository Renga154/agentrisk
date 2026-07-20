# Changelog

## 0.2.3

- Added a cumulative extracted-size cap (10x `--max-download-size`) when unpacking GitHub, npm, and archive targets, guarding against decompression bombs.
- `--min-severity` no longer rewrites the report verdict: the rendered verdict now always reflects the full scan, staying consistent with `--fail-on` and the exit code.
- Added `--no-strict-parse` so best-effort parsing is reachable from the CLI, and aligned the MCP tool's `strictParse` default with the CLI default (`true`, fail-closed).
- Nonexistent scan targets now exit with code 2 (usage error) instead of 3.
- CI now tests Node 20 and 22, sets least-privilege workflow permissions, and pins actions to commit SHAs.
- Dropped empty type-declaration files from the build output; ship `CHANGELOG.md` in the npm package.
- README: the sample output now matches a real `examples/risky-workspace` scan, exit codes moved to their own section, and stale "when this repository is public" disclosure wording removed.

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
