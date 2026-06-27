# Security Policy

## Supported Versions

AgentRisk is pre-1.0. Security fixes are released on the latest minor version.

## Reporting a Vulnerability

When this repository is public, please report vulnerabilities through GitHub private security advisories.

For false positives or missed detections that do not expose private information, open an issue with:

- a minimal fixture
- the expected rule behavior
- the actual AgentRisk output
- your AgentRisk version

## Scanner Safety

AgentRisk is designed as a zero-execution scanner. A vulnerability report is especially valuable if AgentRisk:

- executes target workspace code
- invokes package scripts from the target
- connects to target MCP servers
- leaks scanned file contents unexpectedly
- produces unsafe remediation advice

