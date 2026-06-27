# AgentRisk Corpus

This corpus contains small, reviewable examples for rule development and public demos.

Each fixture is intentionally tiny:

- `benign/` contains examples that should not produce findings.
- `malicious/` contains examples that should produce one or more findings.

Run the corpus locally:

```bash
npm run build
node dist/cli.js scan corpus/benign --format json
node dist/cli.js scan corpus/malicious --format json
```

Do not place real secrets in this corpus.

