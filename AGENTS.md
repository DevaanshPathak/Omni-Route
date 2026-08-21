# Agent Working Agreement

## Repository purpose

Omni-Route is a hackathon MVP for one synthetic property-ownership-transfer journey across Court, Registration, and Revenue mock systems. The key boundary is permanent: **the LLM proposes a canonical event; deterministic code alone resolves, maps, validates, authorizes, executes, verifies, and audits.**

Before making changes, read:

1. [`docs/PRD.md`](docs/PRD.md) for product scope and acceptance criteria.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for implementation boundaries and data flow.
3. [`docs/PHASES.md`](docs/PHASES.md) for the authorized phase deliverables and exit criteria.
4. [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) when changing user-visible demo behavior.

These files are the source of truth. If a request conflicts with them, call out the conflict and follow the user's latest explicit direction. Do not implement a later phase incidentally unless it is required to keep the current phase runnable.

## MVP scope guardrails

- Use Court, Registration, and Revenue consistently; do not introduce real system names or imply live integration.
- Use only synthetic people, documents, properties, and responses.
- Keep mutable runtime state in memory. Load seeds, JSON Schemas, mappings, and demo documents from committed files without rewriting them.
- Do not add PostgreSQL, Redis, queues, authentication, an API gateway service, microservices, or cloud deployment infrastructure unless the user explicitly changes scope.
- Dockerfiles for the two application processes and root Docker Compose are an approved Phase 0 baseline. Keep them stateless and do not add Kubernetes, a reverse proxy, or supporting services without explicit scope.
- Entity resolution and target mapping are deterministic. Do not use an LLM or embedding service for them.
- Never expose an adapter or mutation tool to the LLM. Validate model output as untrusted input at the canonical boundary.
- Fail closed on missing evidence, conflicts, unknown mappings, low confidence, invalid payloads, or failed policy.
- Optimize for two repeatable local scenarios: happy path and Revenue schema drift.

## Planned layout

```text
apps/web/               Next.js UI
apps/api/               Express API, workflow modules, adapters, mock routes
packages/shared/        Runtime schemas, TypeScript types, shared utilities
data/schemas/           Versioned target contracts and approved mappings
data/seeds/             Immutable synthetic system seeds
fixtures/documents/     Synthetic demo inputs
docs/                   Product and implementation guidance
docker-compose.yml      Production-style local web/API topology
```

Keep dependencies pointed inward: UI → API contracts; API workflow → canonical/shared modules; adapters → mock contracts. Canonical modules must not import target-system field names.

## Day-to-day workflow

1. Confirm the requested phase/feature and read its exit criteria.
2. Inspect `git status` and preserve unrelated user changes.
3. Add a focused behavior test before or with production behavior changes.
4. Keep the repo runnable; use explicit stubs or feature flags for incomplete later-phase behavior.
5. Run the narrowest relevant tests, then root lint, typecheck, test, and build commands once Phase 0 defines them.
6. When container files or runtime packaging change, build both images and smoke-test Compose health.
7. Inspect the diff for accidental generated files, secrets, raw uploads, and scope creep.
8. Update source-of-truth docs when contracts, behavior, commands, or phase decisions change.
9. Commit and push the completed increment directly to `main`.

## Version control — required

After every significant working unit—a completed phase, completed feature, or other meaningful demoable increment—commit and push directly to the `main` branch.

- Do not create branches, pull requests, or forks.
- Do not wait for review before pushing an authorized completed increment.
- Use plain, non-interactive commands: `git add <scoped paths>`, `git commit -m "<message>"`, then `git push origin main`.
- Before committing, confirm `git branch --show-current` is `main`, review `git status` and the scoped diff, and run the relevant checks.
- Never include unrelated user changes in a commit. If unrelated changes make a safe scoped commit impossible, stop and explain the conflict.
- Create roughly one commit per working, demoable increment: small enough to be a useful checkpoint, large enough to avoid noisy mechanical commits.
- Do not rewrite public history or use destructive Git commands.

Use Conventional Commit-style messages with the phase or feature when useful:

```text
chore(phase-0): scaffold web and api workspaces
feat(phase-1): add synthetic system routes and seeds
test(phase-5): prove failed preflight calls no adapters
docs: clarify schema drift demo
```

## Code and data conventions

- TypeScript must be strict; avoid `any` at trust boundaries.
- Validate external data at runtime. Types alone do not validate model, API, file, or upload input.
- Keep pure resolver, mapping, and validation functions separate from Express handlers and mutable stores.
- Use explicit enums/unions for event types, systems, operations, workflow states, and validation outcomes.
- Store money-free, identity-free fictional demo values; never copy real personal data into fixtures.
- Seed and schema filenames should include system and purpose; schema versions must be explicit in file content or name.
- Use stable fixture IDs so tests, UI screenshots, and demo narration agree.
- Keep confidence values reproducible from named rules and evidence. Never display an unexplained model confidence as an execution score.
- Use ISO 8601 timestamps in API/audit data and UTC internally.
- The UI must not rely on color alone for state and must keep the technical trace keyboard accessible.
- API keys stay server-side in environment variables. Commit `.env.example`, never `.env`.

## Testing expectations

Every behavior-changing increment should cover its public seam. Prioritize:

- canonical runtime-schema parsing;
- deterministic score breakdowns and conflict blocking;
- mappings against every active schema version;
- validation-gate failures proving zero adapter calls;
- happy-path and drift-path API integration;
- reset behavior; and
- one browser path for the citizen result and technical trace.

Do not claim a check passed unless it was run. If a tool or script does not exist in the current phase, state that plainly rather than inventing a result.

## Definition of a shippable increment

An increment is ready to commit when it satisfies its requested acceptance/exit criteria, keeps existing behavior green, contains no secrets or generated noise, updates affected docs, and can be demonstrated from a clean local state.
