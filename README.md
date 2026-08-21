# Omni-Route

Omni-Route is a hackathon MVP that turns one citizen-described government event into a validated workflow across synthetic departmental systems.

> One citizen event. Multiple government systems. One validated workflow. One result.

The prototype demonstrates a property ownership transfer triggered by a synthetic court decree. An OpenAI model extracts a structured canonical event; deterministic code then resolves records, maps incompatible schemas, validates every action, executes three mock APIs, verifies the responses, and records an audit trace.

The safety boundary is deliberate: **the LLM proposes; it never executes.** Low-confidence, conflicting, or schema-invalid actions fail closed.

## Current status

This repository currently contains the MVP plan and documentation only. Feature implementation begins when an implementation phase in [`docs/PHASES.md`](docs/PHASES.md) is explicitly requested.

## Planned quickstart

Phase 0 will make the local workflow:

```bash
npm install
npm run dev
```

That command is not available yet. Phase 0 will add the frontend/backend workspaces, dependencies, scripts, environment example, and a smoke test. The completed prototype will require a supported Node.js LTS release and an `OPENAI_API_KEY` for live extraction; deterministic fixtures will support repeatable local/demo testing.

## Planned repository structure

```text
apps/
  web/                  Next.js citizen and technical-trace UI
  api/                  Express API, workflow, adapters, and mock routes
packages/
  shared/               Canonical types, schemas, and shared utilities
data/
  schemas/              Department JSON Schemas and mapping metadata
  seeds/                Synthetic departmental records
fixtures/
  documents/            Synthetic court-decree inputs
docs/                   Product, architecture, phase, and demo guidance
```

Only `docs/` and root project metadata exist before Phase 0.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — MVP requirements, non-goals, and acceptance criteria
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — implementation boundaries, data flow, schemas, validation, and state
- [`docs/PHASES.md`](docs/PHASES.md) — independently shippable implementation phases and effort estimates
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — live happy-path and schema-drift walkthrough

## MVP scope

- One workflow: property ownership transfer following a synthetic court decree
- Three synthetic systems: Court, Registration, and Revenue
- OpenAI Structured Outputs for extraction only
- Deterministic record scoring, mapping rules, validation, orchestration, and execution gates
- In-memory runtime state initialized from committed JSON fixtures
- A visible Semantic Action Graph and auditable technical trace
- A mandatory schema-drift path that blocks execution and requests human review

No live government system or real citizen record is used.
