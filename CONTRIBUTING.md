# Contributing

Thanks for helping improve AgentRisk.

## Local Setup

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Adding A Rule

1. Add a rule file under `src/rules/builtins/`.
2. Register it in `src/rules/registry.ts`.
3. Add focused fixtures under `test/fixtures/`.
4. Add or update tests in `test/integration/scan.test.ts`.
5. Keep findings evidence-backed and conservative.

Rules must be deterministic. They must not execute target code, connect to target services, or call model APIs.

## False Positives

AgentRisk should prefer useful evidence over broad fear. If a rule is noisy, lower confidence, narrow the pattern, or make the message more precise.

