# AgentRisk Corpus Report

This report is generated from the checked-in corpus with `npm run corpus:evaluate`.

- Benign cases clean: 3/3
- Malicious cases detected: 5/5

| Case | Expected | Verdict | Findings | Top rules |
| --- | --- | --- | ---: | --- |
| `cautious-instructions` | benign | pass | 0 | - |
| `pinned-mcp` | benign | pass | 0 | - |
| `reviewed-skill` | benign | pass | 0 | - |
| `external-binary` | malicious | block | 1 | `mcp-external-binary-reference` |
| `instruction-exfiltration` | malicious | block | 2 | `instruction-policy-override`, `instruction-secret-exfiltration` |
| `privileged-container` | malicious | block | 2 | `mcp-privileged-container`, `mcp-unpinned-dlx` |
| `remote-fetch-exec` | malicious | block | 2 | `mcp-remote-fetch-exec`, `mcp-shell-wrapper-command` |
| `skill-instruction` | malicious | block | 2 | `instruction-policy-override`, `instruction-secret-exfiltration` |

The corpus is intentionally small and reviewable. It is not a benchmark claim; it is a regression and demo set for deterministic preflight behavior.
