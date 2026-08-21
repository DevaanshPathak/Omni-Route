# Implementation Phases

## Working agreement

These phases implement one local hackathon MVP: a synthetic court decree becomes a canonical property-transfer event, deterministic code resolves and maps it across Court, Registration, and Revenue, validated mock actions execute, and one result plus technical trace is shown.

Each phase must leave `main` installable, runnable, and green. Use feature flags, stubs, or fixture-driven seams when a later capability is incomplete. Do not add PostgreSQL, Redis, authentication, a separate gateway, queues, or live government integrations.

Estimated total: **27–35 team hours** for a 2–3 person team. Estimates are elapsed team effort, not per-person totals, and assume narrow fixtures rather than production hardening.

## Phase 0 — Repository scaffold and tooling

**Estimate:** 2–3 hours

### Goal

Create the smallest working TypeScript monorepo that starts the UI and API locally and provides shared runtime contracts without implementing product behavior.

### Deliverables

- npm workspaces at `apps/web`, `apps/api`, and `packages/shared`.
- Next.js + React + TypeScript + Tailwind in `apps/web`.
- Express + TypeScript in `apps/api`.
- Shared TypeScript/runtime-schema package in `packages/shared`.
- Root scripts for `dev`, `build`, `lint`, `typecheck`, and `test`.
- `.env.example` with server-only `OPENAI_API_KEY`; no secret or default key.
- Planned directories: `data/schemas`, `data/seeds`, and `fixtures/documents`.
- Health endpoint and minimal web page proving web-to-API connectivity.
- Fast unit-test runner and formatting/lint configuration; avoid heavy infrastructure.

### Constraints

- Use npm and a supported Node.js LTS release.
- Keep the frontend and API as the only running processes.
- Do not add a database, queue, auth provider, gateway, container stack, or deployment configuration.
- Do not implement extraction or workflow logic in this phase.

### Verification

- Fresh `npm install` succeeds.
- `npm run dev` starts both applications.
- The web page displays API health.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.

### Exit criteria

The repository is runnable from a clean checkout with documented commands, and the scaffold can be demoed without any Phase 1 code.

## Phase 1 — Synthetic systems and fixtures

**Estimate:** 3–4 hours

### Goal

Create three independently addressable mock systems whose records and payloads are intentionally incompatible, plus deterministic happy/conflict fixtures.

### Deliverables

- Committed JSON seeds for Court, Registration, and Revenue records.
- Committed synthetic decree fixture using only fictional data.
- Distinct contracts:
  - Court: `order_ref`, `property_ref`, `beneficiary`, `decree_status`.
  - Registration: `document_no`, `property_id`, `buyer_name`, `instrument_type`.
  - Revenue: `survey_no`, `owner_nm`, `mutation_required`.
- Express route modules providing lookup and update operations for each system.
- In-memory mutable copies of seed records; seed files remain unchanged.
- A reset endpoint/service that restores pristine state.
- Happy-path, missing-record, and conflicting-property fixtures.
- Route tests for valid lookup/update, invalid payload, not found, and reset.

### Constraints

- Mock routes run inside `apps/api`; they are separate modules, not microservices.
- Do not use a database or claim the routes mirror real government APIs.
- No LLM calls and no cross-system orchestration yet.

### Verification

- All three systems can be queried and updated independently.
- Their payloads cannot be reused across systems without translation.
- Reset restores byte-equivalent logical seed state.
- Tests prove conflict fixtures are distinct from the happy fixture.

### Exit criteria

The app remains runnable, each synthetic system works on its own, and its behavior is covered by focused tests.

## Phase 2 — Canonical model and runtime store

**Estimate:** 2–3 hours

### Goal

Introduce the stable, department-independent model and in-memory workflow/audit state without changing the mock-system contracts.

### Deliverables

- Runtime schemas and TypeScript types for `CanonicalPerson`, `CanonicalProperty`, `CanonicalDocument`, `CanonicalEvent`, evidence references, workflow state, validation results, and audit events.
- Canonical types contain no Court/Registration/Revenue field names.
- In-memory repositories for canonical entities, workflows, Semantic Action Graph snapshots, validation results, and append-only audit events.
- Workflow IDs and ordered state transitions.
- Reset integration so all mutable canonical and mock state returns to baseline.
- Unit tests for runtime parsing, invalid canonical data, transitions, IDs, and audit append order.

### Constraints

- Runtime schemas, not TypeScript types alone, guard external data.
- Do not persist mutable state to seed JSON.
- Do not implement AI extraction, entity scoring, mapping, or adapter orchestration yet.

### Verification

- Valid canonical fixtures parse; invalid or target-schema-shaped objects fail.
- Invalid workflow transitions are rejected.
- Audit entries are ordered and cannot be updated through repository APIs.
- Existing health and mock-system tests remain green.

### Exit criteria

The API can create and inspect a fixture-backed canonical workflow entirely independently of departmental field names.

## Phase 3 — AI understanding

**Estimate:** 4–5 hours

### Goal

Convert text or the supported synthetic document into an untrusted, schema-constrained canonical event while preserving a deterministic test/demo path.

### Deliverables

- Server-only OpenAI integration using Structured Outputs for the canonical extraction schema.
- Text input and the minimum document path needed for the supplied synthetic decree; prefer text extraction before model interpretation when practical.
- Strict input size/type validation and synthetic-only UI/API messaging.
- Extraction prompt/version identifier and source evidence references in the output.
- Canonical runtime validation immediately after the model response.
- Provider abstraction with a deterministic fixture/stub for automated tests and demo fallback.
- Clear errors for missing key, provider failure, refusal, timeout, or schema-invalid output.
- Tests for expected extraction, malformed output rejection, and proof that the extraction component has no adapter/execution dependency.

### Constraints

- The OpenAI client cannot access adapters, mock routes, the execution gate, or mutable departmental state.
- Never treat model confidence as execution authorization.
- Do not broaden OCR or file support beyond the committed demo input.

### Verification

- The predefined decree yields `PROPERTY_OWNERSHIP_TRANSFER`, Raju, property reference 45, and order 123 in live mode when configured.
- Stub mode produces the same canonical contract repeatably.
- Invalid extraction cannot create an executable action.
- Logs and errors do not expose the API key or raw document contents.

### Exit criteria

A citizen input can produce a validated canonical event and an `UNDERSTANDING_COMPLETE` UI/API state, while all earlier checks remain green.

## Phase 4 — Entity resolution, schema registry, and semantic mapping

**Estimate:** 4–5 hours

### Goal

Resolve the canonical property/person across the three seeded systems and build a non-executable Semantic Action Graph using transparent deterministic rules.

### Deliverables

- File-backed, versioned JSON Schemas and approved mapping metadata for every mock request/response.
- Pure weighted resolver using legal-order reference, property relationship, location, and normalized owner name; weights and score components are visible.
- Configured automatic threshold of `0.90` and hard-conflict rules.
- Deterministic workflow routing for the single supported event type.
- Mapper that uses only approved canonical-to-target rules and explicit transforms.
- Serializable Semantic Action Graph containing target operation, resolved record, evidence, mappings, payload preview, score, and pending validation state.
- Tests for positive match, no match, tied/ambiguous candidate, required-identifier conflict, all target mappings, and schema-version mismatch.

### Constraints

- Do not call an LLM for entity matching or mapping.
- Do not execute adapters in this phase.
- Unknown target fields are unapproved by default and cannot become executable through string similarity alone.

### Verification

- Happy fixtures resolve the intended Court, Registration, and Revenue records at or above threshold.
- Conflicting fixtures block resolution even if other weighted signals match.
- Generated previews conform to current schema shapes before the formal Phase 5 gate.
- Score explanations are stable across repeated runs.

### Exit criteria

The API returns a complete, inspectable, non-executable Semantic Action Graph for both matched and conflicted fixtures.

## Phase 5 — Validation, orchestration, adapters, and audit

**Estimate:** 5–6 hours

### Goal

Turn a Semantic Action Graph into a safely gated, verified workflow with a complete audit trace.

### Deliverables

- Ordered deterministic checks for canonical shape, entity consistency, mapping approval, confidence, target JSON Schema, business rules, and execution policy.
- Aggregate preflight requiring every action to pass before the first adapter call.
- Court, Registration, and Revenue adapters that accept validated internal actions, call only enumerated local mock routes, and normalize responses.
- Orchestrator implementing `resolve → map → validate → execute → verify → audit`.
- Statuses: `COMPLETED`, `BLOCKED`, `HUMAN_REVIEW_REQUIRED`, `FAILED`, and `PARTIALLY_COMPLETED`.
- Append-only in-memory audit events for state transitions, evidence, rules, requests, responses, and final status.
- Workflow create/status/trace endpoints.
- Integration tests for happy completion, failed preflight with zero adapter calls, target API failure, verification failure, and reset.

### Constraints

- No adapter runs until all preflight checks pass.
- The LLM never receives adapter tools or controls state transitions.
- Do not add retries, queues, distributed rollback, or durable storage.
- Audit request/response summaries must not contain secrets or raw uploaded bytes.

### Verification

- Happy path changes all three in-memory mock records and verifies the new values.
- Any validation failure produces zero mutations in every mock system.
- A runtime failure records exactly which actions executed and reports the correct terminal status.
- The trace can reconstruct every deterministic decision under one workflow ID.

### Exit criteria

One API call can drive a validated fixture end-to-end, and tests prove that unsafe proposals cannot reach execution.

## Phase 6 — Citizen journey and technical visualization

**Estimate:** 5–6 hours

### Goal

Make the end-to-end workflow obvious to a first-time judge while keeping the primary citizen experience simple.

### Deliverables

- Start screen with upload and text-description paths.
- Understanding state showing extracted event, person, property, and order.
- System-discovery state showing Court, Registration, and Revenue.
- Progress states for resolution, mapping, validation, execution, and verification.
- Unified completed/blocked/failed result with workflow ID.
- Expandable technical view rendering the Semantic Action Graph, record identifiers, evidence, score components, field mappings, payloads, validation checks, and adapter results.
- Accessible loading, error, and retry/reset behavior.
- Responsive presentation suitable for the demo screen.
- Component tests and one browser happy-path test using the deterministic provider stub.

### Constraints

- Do not expose the API key or call OpenAI from the browser.
- Keep technical detail behind an explicit view; the citizen result leads with the outcome.
- Prefer a clear static graph layout over a complex graph library unless evidence shows the library saves time.
- Do not add unrelated dashboards, accounts, or administration screens.

### Verification

- An unfamiliar user can submit the fixture and reach a unified result without instructions.
- A judge can identify the canonical event, three different schemas, confidence evidence, deterministic gate, and final calls within about 30 seconds.
- Keyboard navigation, visible focus, status text, and non-color-only states work for the demo flow.

### Exit criteria

The complete happy path is demoable through the browser with no developer console or manual API call.

## Phase 7 — Schema drift and demo hardening

**Estimate:** 2–3 hours

### Goal

Wire the mandatory safe-failure scenario, eliminate demo fragility, and rehearse a sub-four-minute presentation.

### Deliverables

- Revenue schema variant renaming `owner_nm` to `registered_owner` while leaving approved mapping metadata unchanged.
- Demo control or deterministic fixture selection to enable/disable drift and visibly reset state.
- Drift trace showing expected field, available field, candidate score `0.61`, threshold `0.90`, failed rule, `BLOCKED`, and `HUMAN_REVIEW_REQUIRED`.
- Integration assertion that the blocked run calls zero adapters and mutates zero system records.
- Happy-path and drift-path browser tests.
- Friendly handling for missing OpenAI credentials/network via an explicitly labeled deterministic demo mode.
- Rehearsal notes synchronized with `docs/DEMO_SCRIPT.md` and a pre-demo reset checklist.
- Final lint, typecheck, test, build, secret scan/diff review, and local cold-start rehearsal.

### Constraints

- Drift behavior must come from versioned schema/mapping policy, not a hardcoded UI error screen.
- Do not silently fall back from live extraction; display when deterministic demo mode is active.
- Do not add production infrastructure during hardening.

### Verification

- Happy path completes and drift path blocks on consecutive clean resets.
- Blocked run leaves Court, Registration, and Revenue unchanged.
- Both scenarios remain understandable without opening source code.
- Full spoken demo completes in under four minutes on the presentation machine.

### Exit criteria

The repository has repeatable automated coverage for both headline scenarios, a reliable reset/fallback path, and a rehearsed live demo.
