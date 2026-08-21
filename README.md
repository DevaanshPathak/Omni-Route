# Omni-Route

Omni-Route is a hackathon MVP that turns one citizen-described government event into a validated workflow across synthetic departmental systems.

> One citizen event. Multiple government systems. One validated workflow. One result.

The safety boundary is deliberate: **the LLM proposes; it never executes.** Deterministic code will resolve records, map incompatible schemas, validate actions, execute approved mock operations, and record the audit trace.

## Current status

Phases 0 through 5 are implemented:

- npm workspaces for a Next.js web app, Express API, and shared runtime contracts;
- strict TypeScript, ESLint, Prettier, Tailwind CSS, and Vitest;
- a typed `GET /health` contract displayed by the server-rendered web page;
- production Docker images for the web and API applications; and
- Docker Compose for a one-command local deployment;
- three independent Court, Registration, and Revenue mock APIs;
- versioned synthetic JSON seeds copied into resettable in-memory stores; and
- happy, conflict, missing-record, and synthetic decree fixtures;
- strict canonical Person, Property, Document, Event, workflow, validation, graph, and audit contracts;
- an in-memory canonical runtime with guarded state transitions and append-only audit access; and
- fixture-backed canonical workflow create/inspect endpoints with a shared demo reset;
- server-only OpenAI Responses API extraction with strict Structured Outputs;
- bounded synthetic text and extracted plain-text document inputs;
- an automatic deterministic fixture fallback for tests and key-free demos; and
- an interactive browser console for testing text or `.txt` extraction, inspecting the canonical
  result and audit timeline, and reading the three seeded system records without mutating them.
- versioned request/response JSON Schemas and approved canonical-to-target mapping metadata;
- deterministic three-system entity resolution with named weighted signals and a `0.90` gate; and
- a non-executable Semantic Action Graph preview and inspectable workflow trace API.
- an ordered deterministic preflight across canonical, entity, mapping, confidence, JSON Schema,
  business-rule, and execution-policy checks;
- isolated Court, Registration, and Revenue adapters that receive only validated actions; and
- sequential execution, response verification, partial-failure reporting, and append-only audit.

The complete citizen and technical visualization is Phase 6. See [`docs/PHASES.md`](docs/PHASES.md).

## Prerequisites

Choose either:

- Node.js 22 or newer plus npm; or
- Docker with Docker Compose.

## Run locally

```bash
npm install
npm run dev
```

Open:

- Web: <http://localhost:3000>
- API health: <http://localhost:4100/health>

At <http://localhost:3000>, the decree is preloaded. Keep **Deterministic fixture** selected and
choose **Extract canonical event** for the repeatable offline path, or choose **Auto** / **Live
model** to exercise the server-side OpenAI configuration. The result shows canonical entities,
workflow state, extraction provenance, audit events, and raw JSON. **Reset demo** clears all
in-memory workflow state and restores the seeded mock records.

The current console is deliberately read-only toward Court, Registration, and Revenue. It tests
Phases 0-3; deterministic resolution, mapping, validation, and execution remain later phases.

The root development command builds the shared package, then starts only the web and API processes. When OpenAI configuration is absent, `provider: "auto"` uses the deterministic fixture provider.

## Run with Docker

```bash
docker compose up --build
```

Compose builds separate production images, waits for the API health check, and then starts the web application. The web is available on port 3000 and the API health endpoint on host port 4100.

Stop the stack with:

```bash
docker compose down
```

To change host ports, copy `.env.example` to `.env` and edit `WEB_PORT` or `API_PORT`. Container-to-container traffic continues to use the internal API address.

## Commands

| Command                     | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `npm run dev`               | Start the web and API development processes            |
| `npm run build`             | Build shared contracts, API, and production web output |
| `npm run lint`              | Lint every workspace                                   |
| `npm run typecheck`         | Type-check every workspace                             |
| `npm test`                  | Run all Vitest suites                                  |
| `npm run format:check`      | Check repository formatting                            |
| `docker compose up --build` | Build and run the production container topology        |

## Repository structure

```text
apps/
  web/                  Next.js citizen interface and web container
  api/                  Express API and API container
packages/
  shared/               Runtime schemas and shared TypeScript contracts
data/
  schemas/              Department schemas and mappings from Phase 4 onward
  seeds/                Versioned Court, Registration, and Revenue records
fixtures/
  canonical/            Validated canonical event fixture
  documents/            Synthetic court-decree input
  scenarios/            Happy, conflict, and missing-record manifests
docs/                   Product, architecture, phase, and demo guidance
docker-compose.yml      Local production-style topology
```

## Configuration

| Variable            | Used by                       | Default                 | Notes                                     |
| ------------------- | ----------------------------- | ----------------------- | ----------------------------------------- |
| `INTERNAL_API_URL`  | Next.js server                | `http://localhost:4100` | Compose sets this to `http://api:4000`    |
| `PORT`              | Individual production process | app-specific            | Compose supplies 3000/4000                |
| `WEB_PORT`          | Docker Compose                | `3000`                  | Host port only                            |
| `API_PORT`          | Docker Compose                | `4100`                  | Host port only                            |
| `OPENAI_API_KEY`    | API extraction service        | unset                   | Server-side only                          |
| `OPENAI_BASE_URL`   | API extraction service        | OpenAI SDK default      | Optional OpenAI-compatible API base URL   |
| `OPENAI_MODEL_NAME` | API extraction service        | unset                   | Required with the key for live extraction |

Browser requests use same-origin Next.js route handlers. `INTERNAL_API_URL` and all OpenAI
configuration remain server-side and are not shipped in the browser bundle.

## Synthetic API contracts

All endpoints use fictional data. Successful mock-system responses use `{ "data": ... }`; errors use `{ "error": { "code", "message", "issues?" } }`.

| System       | Lookup                                          | Update                                       |
| ------------ | ----------------------------------------------- | -------------------------------------------- |
| Court        | `GET /mock/court/orders/:orderRef`              | `POST /mock/court/orders/:orderRef/dispatch` |
| Registration | `GET /mock/registration/properties/:propertyId` | `POST /mock/registration/transfers`          |
| Revenue      | `GET /mock/revenue/properties/:encodedSurveyNo` | `POST /mock/revenue/mutations`               |
| All systems  | —                                               | `POST /mock/reset`                           |

The same concept intentionally has different field names:

```text
Court         property_ref / beneficiary
Registration  property_id  / buyer_name
Revenue       survey_no    / owner_nm
```

Example lookup:

```bash
curl http://localhost:4100/mock/court/orders/ORD-123
```

`POST /mock/reset` restores fresh in-memory copies of all committed seeds. Runtime updates never rewrite the files in `data/seeds/`.

## Canonical workflow API

Phase 2 adds a deterministic fixture seam for exercising the canonical boundary before AI extraction exists:

| Method | Endpoint                        | Behavior                                       |
| ------ | ------------------------------- | ---------------------------------------------- |
| POST   | `/api/demo/canonical-workflows` | Create a workflow from the validated fixture   |
| GET    | `/api/workflows/:workflowId`    | Inspect canonical state and ordered audit data |
| POST   | `/api/demo/reset`               | Reset canonical and all three mock stores      |

Canonical reads contain no Court, Registration, or Revenue field names. Runtime state and ID sequences reset on process restart or either demo reset route.

## AI understanding API

`POST /api/workflows` accepts only explicitly synthetic input. It supports pasted text or browser-extracted UTF-8 text from a `.txt` document; raw uploads and OCR remain outside Phase 3.

```json
{
  "synthetic": true,
  "provider": "auto",
  "input": {
    "kind": "text",
    "text": "Transfer synthetic property 45 to Raju under order ORD-123."
  }
}
```

Provider modes:

- `auto`: use live extraction when both key and model are configured; otherwise use the committed fixture.
- `openai`: require live configuration and fail clearly when it is missing.
- `fixture`: always use the deterministic ORD-123 demo proposal.

Successful extraction creates a canonical workflow in `UNDERSTANDING_COMPLETE`. Provider output is validated as an untrusted proposal, converted to deterministic canonical IDs, and validated again against the canonical event schema. This phase does not resolve entities, map schemas, or call mock-system updates.

## Deterministic planning API

Phase 4 adds two non-executable planning endpoints:

| Method | Endpoint                           | Behavior                                      |
| ------ | ---------------------------------- | --------------------------------------------- |
| POST   | `/api/workflows/:workflowId/plan`  | Resolve records and build the action graph    |
| GET    | `/api/workflows/:workflowId/trace` | Inspect the canonical workflow and graph data |

Planning loads committed versioned JSON Schemas and approved mapping rules from `data/schemas/`.
The resolver exposes legal-order, property-relationship, location, and operation-eligibility score
components. Phase 4 previews payloads but never invokes a mock mutation route.

## Validated execution API

`POST /api/workflows/:workflowId/execute` plans the workflow when needed, runs the complete
aggregate preflight, and calls adapters only if every action passes. It returns the same trace
contract with validation results, sanitized request/response summaries, adapter results, and the
terminal workflow state. Known preflight failures return a blocked workflow outcome with zero
adapter calls; runtime failures report `FAILED` or `PARTIALLY_COMPLETED`.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — MVP requirements, non-goals, and acceptance criteria
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — boundaries, data flow, schemas, validation, state, and containers
- [`docs/PHASES.md`](docs/PHASES.md) — independently shippable implementation phases
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — happy-path and schema-drift presentation

No live government system or real citizen record is used.
