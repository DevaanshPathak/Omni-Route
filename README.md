# Omni-Route

Omni-Route is a hackathon MVP that turns one citizen-described government event into a validated workflow across synthetic departmental systems.

> One citizen event. Multiple government systems. One validated workflow. One result.

The safety boundary is deliberate: **the LLM proposes; it never executes.** Deterministic code will resolve records, map incompatible schemas, validate actions, execute approved mock operations, and record the audit trace.

## Current status

Phase 0 is implemented:

- npm workspaces for a Next.js web app, Express API, and shared runtime contracts;
- strict TypeScript, ESLint, Prettier, Tailwind CSS, and Vitest;
- a typed `GET /health` contract displayed by the server-rendered web page;
- production Docker images for the web and API applications; and
- Docker Compose for a one-command local deployment.

Product workflow behavior begins in Phase 1. See [`docs/PHASES.md`](docs/PHASES.md).

## Prerequisites

Choose either:

- Node.js 20.9 or newer plus npm; or
- Docker with Docker Compose.

## Run locally

```bash
npm install
npm run dev
```

Open:

- Web: <http://localhost:3000>
- API health: <http://localhost:4100/health>

The root development command builds the shared package, then starts only the web and API processes. `OPENAI_API_KEY` is reserved for Phase 3 and is not needed for Phase 0.

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
  schemas/              Department schemas and mappings from Phase 1 onward
  seeds/                Synthetic records from Phase 1 onward
fixtures/
  documents/            Synthetic court-decree inputs from Phase 1 onward
docs/                   Product, architecture, phase, and demo guidance
docker-compose.yml      Local production-style topology
```

## Configuration

| Variable           | Used by                       | Default                 | Notes                                  |
| ------------------ | ----------------------------- | ----------------------- | -------------------------------------- |
| `INTERNAL_API_URL` | Next.js server                | `http://localhost:4100` | Compose sets this to `http://api:4000` |
| `PORT`             | Individual production process | app-specific            | Compose supplies 3000/4000             |
| `WEB_PORT`         | Docker Compose                | `3000`                  | Host port only                         |
| `API_PORT`         | Docker Compose                | `4100`                  | Host port only                         |
| `OPENAI_API_KEY`   | Future API extraction service | unset                   | Server-side only; unused in Phase 0    |

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — MVP requirements, non-goals, and acceptance criteria
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — boundaries, data flow, schemas, validation, state, and containers
- [`docs/PHASES.md`](docs/PHASES.md) — independently shippable implementation phases
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — happy-path and schema-drift presentation

No live government system or real citizen record is used.
