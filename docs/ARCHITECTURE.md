# MVP Implementation Architecture

## 1. Scope and invariant

Omni-Route is a local hackathon prototype for one synthetic property-ownership-transfer journey across Court, Registration, and Revenue systems.

The non-negotiable invariant is:

> The LLM produces a schema-constrained proposal. Only deterministic code may resolve, map, validate, authorize, execute, verify, or audit an action.

No target adapter is exposed as an LLM tool. Model output is untrusted input to the deterministic pipeline.

## 2. System context

```text
Citizen browser
      │ text / synthetic document
      ▼
Next.js UI
      │ REST / JSON
      ▼
Express API
      ├─ input handling + OpenAI extraction
      ├─ canonical model
      ├─ deterministic resolver + mapper
      ├─ validation + orchestration
      ├─ audit trace
      └─ adapters
           ├─ Court mock routes
           ├─ Registration mock routes
           └─ Revenue mock routes
```

For MVP speed, the mock routes live in the same API process under separate route modules. They retain explicit adapter boundaries and incompatible contracts, so they can be split later without changing the core workflow.

The browser calls same-origin Next.js route handlers. These server-side handlers validate browser
input and upstream API responses with shared runtime schemas, then proxy only the Phase 0-3
operations needed by the console: workflow creation, demo reset, and read-only seeded-record
inspection. Mock mutation routes, `INTERNAL_API_URL`, and OpenAI configuration are not exposed to
client code.

The web and API processes can run directly through npm or as two stateless Docker containers. Containerization changes packaging, not the application boundaries: the synthetic mock routes remain modules inside the API container.

## 3. Probabilistic/deterministic boundary

```text
                 PROBABILISTIC
┌─────────────────────────────────────────┐
│ OpenAI extraction                      │
│                                         │
│ document/text → proposed canonical event│
│ + extracted fields + source evidence    │
└───────────────────┬─────────────────────┘
                    │ schema-constrained but untrusted
                    ▼
             CANONICAL EVENT DTO
                    │
                    ▼
                 DETERMINISTIC
┌─────────────────────────────────────────┐
│ Parse and canonical-schema validation   │
│ Workflow routing                        │
│ Candidate lookup and weighted scoring   │
│ Approved semantic mapping rules         │
│ JSON Schema and entity validation       │
│ Business rules and confidence threshold │
│ Execution policy                        │
│ Adapter calls and response verification │
│ Audit recording                         │
└─────────────────────────────────────────┘
```

Crossing the boundary never grants execution authority. Invalid structured output is rejected; missing or contradictory evidence produces a blocked workflow.

## 4. Critical data flow

```text
Input
  ↓
OpenAI Structured Output
  ↓
Canonical-event validation
  ↓
Deterministic route selection
  ↓
Candidate lookup + entity scoring
  ↓
Canonical entities
  ↓
Approved semantic mappings
  ↓
Semantic Action Graph
  ↓
Preflight validation of every action
  ├─ FAIL → BLOCKED / HUMAN_REVIEW_REQUIRED → audit
  └─ PASS → adapters → mock APIs → response verification → audit
```

All actions are prepared and preflighted before the first adapter call. A runtime mock failure after execution begins is reported as `FAILED` or `PARTIALLY_COMPLETED`; the audit trace records which actions ran. Distributed rollback is outside the MVP.

## 5. Canonical data model

The shared package will define runtime schemas and TypeScript types for these concepts. Target-system fields are prohibited here.

```ts
type CanonicalPerson = {
  id: string;
  name: string;
};

type CanonicalProperty = {
  id: string;
  declaredReference?: string;
  surveyNumber?: string;
  village?: string;
  district?: string;
};

type CanonicalDocument = {
  id: string;
  type: "COURT_DECREE";
  reference: string;
  source: "synthetic_text" | "synthetic_upload";
  evidence: EvidenceRef[];
};

type CanonicalEvent = {
  id: string;
  type: "PROPERTY_OWNERSHIP_TRANSFER";
  effectiveOwner: CanonicalPerson;
  property: CanonicalProperty;
  legalOrder: CanonicalDocument;
  evidence: EvidenceRef[];
};

type EvidenceRef = {
  source: string;
  field: string;
  value: string;
};
```

Runtime validation is required when the extraction response enters the canonical layer; TypeScript types alone are insufficient.

Phase 2 implements these strict schemas in the shared package. The API keeps separate in-memory maps for canonical people, properties, documents, and events, while workflow views return a cloned event aggregate. Target-shaped unknown fields are rejected at the canonical boundary.

Workflow records contain a deterministic `WRK-000001`-style ID, current state, revision, timestamps, and an ordered transition history. The runtime permits only declared state transitions. Semantic Action Graph snapshots and validation results are append-only collections for a workflow; audit events receive per-workflow sequence numbers and are exposed only through cloned reads.

Phase 3 adds a narrower `CanonicalEventProposal` contract for model output. The proposal contains extracted canonical concepts but no internal IDs, target-system fields, operations, or tools. Deterministic code hashes the normalized synthetic input to assign canonical IDs, attaches the prompt/provider provenance and evidence source, parses the full `CanonicalEvent`, and only then creates a workflow.

The live provider uses the server-side OpenAI Responses API with `responses.parse` and `zodTextFormat`, following the [official Structured Outputs guidance](https://developers.openai.com/api/docs/guides/structured-outputs). The client receives no tool definitions. A fixture provider implements the same interface for automated tests and repeatable demos.

## 6. Synthetic systems and adapters

The three systems intentionally describe equivalent concepts differently and may use different identifiers for the same property.

| Concept        | Court           | Registration      | Revenue                                      |
| -------------- | --------------- | ----------------- | -------------------------------------------- |
| Legal order    | `order_ref`     | `document_no`     | supporting reference in seeded relation data |
| Property       | `property_ref`  | `property_id`     | `survey_no`                                  |
| New owner      | `beneficiary`   | `buyer_name`      | `owner_nm`                                   |
| Operation flag | `decree_status` | `instrument_type` | `mutation_required`                          |

Representative write payloads:

```json
{
  "order_ref": "123",
  "property_ref": "COURT-PROP-45",
  "beneficiary": "Raju",
  "decree_status": "DISPATCHED"
}
```

```json
{
  "document_no": "123",
  "property_id": "REG-2391",
  "buyer_name": "Raju",
  "instrument_type": "COURT_ORDER"
}
```

```json
{
  "survey_no": "45/2",
  "owner_nm": "Raju",
  "mutation_required": true
}
```

Adapters accept validated internal actions, convert them to these contracts, call the corresponding local mock route, and normalize the response. The workflow core never imports departmental field names from route handlers.

Implemented Phase 1 mock endpoints:

```text
GET  /mock/court/orders/:orderRef
POST /mock/court/orders/:orderRef/dispatch

GET  /mock/registration/properties/:propertyId
POST /mock/registration/transfers

GET  /mock/revenue/properties/:surveyNo
POST /mock/revenue/mutations
```

These routes are synthetic demonstrations, not representations of real government contracts.

Every request body is validated against a strict Zod contract at the HTTP boundary. Successful responses use a `{ "data": ... }` envelope. Invalid requests and missing records use a stable JSON error envelope; cross-system payload reuse fails validation because unknown fields are rejected and required target fields are absent.

`POST /mock/reset` restores all three stores from their startup snapshots without modifying the seed files and clears the Phase 2 canonical runtime. The update operations are deterministic set operations and are idempotent for the same payload; cross-system orchestration remains outside Phase 2.

## 7. Entity resolution

Entity resolution is a pure deterministic scoring function over candidate records loaded from seed data. It is not an LLM or learned model.

A committed rule configuration assigns weights totaling `1.00`, for example:

| Evidence                       | Weight | Match behavior                                        |
| ------------------------------ | -----: | ----------------------------------------------------- |
| Legal-order/document reference |   0.35 | normalized exact match                                |
| Property/survey relationship   |   0.30 | exact match through seeded relation metadata          |
| Village and district           |   0.20 | normalized exact match; both required for full weight |
| Operation eligibility          |   0.15 | target record is in the required pre-transfer state   |

The resolver returns the candidate ID, total score, each contributing signal, and any conflicts. The automatic threshold is configuration, initially `0.90`. A conflict on a required identifier blocks regardless of aggregate score. Current-owner fields are not compared with the intended post-transfer owner; that would incorrectly penalize the records the workflow is meant to update.

The weights and normalizers are intentionally simple, visible, and testable. More sophisticated fuzzy matching is not required for the MVP.

## 8. Schema registry and semantic mapping

The file-backed registry contains:

- versioned JSON Schemas for each request/response contract;
- approved mappings from canonical paths to target fields;
- deterministic transforms, such as enum or boolean conversion;
- required evidence and minimum confidence; and
- schema version metadata.

A mapping result records source concept, target system, target field, transform, rationale/rule ID, evidence references, and deterministic confidence.

The mapper does not ask the LLM to improvise a production payload. Unknown fields can be shown as candidates in the drift demonstration, but they remain unapproved and non-executable.

## 9. Semantic Action Graph

The workflow builds a serializable graph for both orchestration and UI rendering:

```text
Event: PROPERTY_OWNERSHIP_TRANSFER
  ├─ Entity: person/Raju
  ├─ Entity: property/P-0045
  ├─ Action: Court.dispatchOrder
  ├─ Action: Registration.recordTransfer
  └─ Action: Revenue.createMutation
```

Each action contains:

- target system and operation;
- resolved system record and evidence;
- canonical-to-target mappings;
- generated payload;
- mapping and entity scores;
- ordered validation results;
- execution status; and
- normalized response, if executed.

The graph is the shared contract between the backend trace endpoint and the judge-facing technical visualization.

## 10. Validation and execution gate

Validation is deterministic and ordered:

1. **Canonical validation:** structured extraction matches the canonical runtime schema.
2. **Entity validation:** required records exist; identifiers, relationships, and locations are consistent.
3. **Mapping validation:** every required target field has an approved rule for the active schema version.
4. **Confidence validation:** entity and mapping scores meet the configured threshold; hard conflicts always block.
5. **Payload validation:** each generated payload conforms to the active target JSON Schema.
6. **Business rules:** the order and target records are in allowed synthetic states.
7. **Execution policy:** all actions passed; no action has executed; the workflow is authorized for this supported event type.

Only a single `PASS` from the aggregate gate enables adapters. Validation results include rule ID, outcome, reason, and evidence so the UI never has to infer why a workflow was blocked.

## 11. Workflow state and failure behavior

```text
RECEIVED
  → EXTRACTING
  → RESOLVING
  → MAPPING
  → VALIDATING
  ├─ BLOCKED → HUMAN_REVIEW_REQUIRED
  └─ EXECUTING
       → VERIFYING
       ├─ COMPLETED
       ├─ FAILED
       └─ PARTIALLY_COMPLETED
```

The MVP executes local actions sequentially after a complete preflight. It does not retry automatically: retries can obscure a live demo and are unsafe without idempotency design. A reset command/endpoint reloads pristine seed state between scenarios.

## 12. Audit trail

Each state transition appends an immutable-in-process audit event containing:

```text
event_id, workflow_id, sequence, timestamp, event_type,
actor/component, input/output summary, evidence references, status
```

The trace includes input metadata (not document binary), extraction output, resolver evidence, mappings, validation results, adapter requests/responses, and final status. Application code exposes no update/delete operation for audit events during a run. Durability and tamper-evident storage are future work; the MVP audit resets with the process.

## 13. MVP state and storage

| Data                                | MVP location                                          | Lifecycle                             |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| Synthetic records                   | committed JSON under `data/seeds/`                    | read at startup; copied into memory   |
| JSON Schemas and mapping rules      | committed JSON under `data/schemas/`                  | read-only configuration               |
| Demo decrees                        | committed synthetic files under `fixtures/documents/` | reusable inputs                       |
| Canonical entities and workflows    | API-process memory                                    | reset on restart/demo reset           |
| Mutable mock-system state           | API-process memory initialized from seeds             | reset on restart/demo reset           |
| Validation results and audit events | API-process memory                                    | retained for the current demo session |
| Uploaded document bytes             | transient request processing only                     | not persisted                         |

This design favors a predictable local demo over durability. File-backed configuration is committed; runtime mutations do not rewrite seed files.

## 14. Deliberate schema drift

The drift scenario swaps the active Revenue schema from `owner_nm` to `registered_owner` while leaving the approved mapping registry unchanged.

The deterministic result is:

```text
required approved field: owner_nm
available unapproved field: registered_owner
candidate score: 0.61
automatic threshold: 0.90
gate: BLOCKED
next state: HUMAN_REVIEW_REQUIRED
adapter calls: 0
```

The fixture must prove that no Court, Registration, or Revenue mutation occurred. This is a schema-version/mapping-policy failure, not an LLM confidence decision.

## 15. API surface

The implemented Phase 2 fixture and inspection surface is intentionally small:

```text
GET  /health                         Phase 0 service health contract
POST /api/demo/canonical-workflows  create from validated canonical fixture
GET  /api/workflows/:id             citizen-facing state/result
POST /api/demo/reset                reload pristine seed state
```

Phase 3 implements the input boundary:

```text
POST /api/workflows                 extract synthetic text/document text
                                    → canonical workflow at UNDERSTANDING_COMPLETE
POST /api/workflows/:id/plan        deterministic resolution + mapping preview
POST /api/workflows/:id/execute     aggregate gate + adapters + verification
GET  /api/workflows/:id/trace       canonical, graph, validation, execution, audit
```

Inputs are strict JSON with `synthetic: true`, a maximum of 12,000 text characters, and either `kind: text` or a `.txt`/`text/plain` document whose text was extracted by the browser. Provider selection is `auto`, `openai`, or `fixture`. Auto mode chooses live extraction only when key and model are configured. Refusal, timeout, provider failure, missing configuration, unsupported fixture input, and schema-invalid output are distinct fail-closed responses.

The Phase 0-3 browser console presents the canonical result and audit timeline but does not expose
mock-system mutation controls. Department resolution, mapping, validation, and execution remain
unavailable until their deterministic phases are implemented.

Later phases add the trace and schema-drift operations:

```text
GET  /api/workflows/:id/trace       Semantic Action Graph + audit detail
POST /api/demo/schema/revenue/drift enable/disable the drift fixture
```

Mock-system routes are internal demo boundaries in the same process and are not called by the browser.

## 16. Container packaging

```text
Host browser
    │ :3000
    ▼
Web container (Next.js standalone server)
    │ http://api:4000 on the Compose network
    ▼
API container (Express)
    │
    └─ in-memory Phase 0+ runtime state
```

- `apps/web/Dockerfile` produces a Next.js standalone runtime image.
- `apps/api/Dockerfile` produces a production-dependency API image.
- The API image includes `data/` and `fixtures/`; Phase 3 reads the synthetic records and deterministic extraction fixtures at runtime.
- Compose passes `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL_NAME` only to the API container. They are never available to the browser bundle.
- `docker-compose.yml` publishes the web and health endpoints, waits for API health before starting the web service, and passes the internal API URL server-side.
- Both containers run as the unprivileged `node` user and handle their normal process signals through Compose `init`.
- Runtime state remains ephemeral. Recreating the API container resets it by design.

Compose is a deployment convenience for the hackathon, not an API gateway or a production orchestration platform.

## 17. Out of scope infrastructure

| Component               | Why it is excluded from the MVP                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL              | Durable relational persistence does not improve the four-minute local proof; seeded JSON plus memory is sufficient.    |
| Redis/queue             | There is no distributed worker, coordination, or throughput requirement in the three-action demo.                      |
| Separate API gateway    | A single local API process does not justify another deployable service.                                                |
| Authentication/identity | The prototype uses only synthetic users and records; production identity and policy cannot be credibly simulated here. |
| Object/audit storage    | Inputs and traces are demo-only and resettable; durable/tamper-evident storage is future work.                         |
| Microservices           | Process boundaries would add failure modes without strengthening the semantic interoperability proof.                  |

## 18. Security and configuration constraints

- Keep `OPENAI_API_KEY` server-side and out of logs, responses, fixtures, and Git.
- Limit accepted upload type and size; treat extracted text and model output as untrusted.
- Never interpolate model output into routes, code, or arbitrary tool calls.
- Permit only enumerated event types, systems, operations, mappings, and adapters.
- Store and display synthetic data only.
- Redact raw document content from normal audit summaries.
- Run application containers as an unprivileged user and keep secrets in runtime environment variables, not image layers.

## 19. Verification seams

The highest-value automated checks are:

- canonical extraction contract tests using deterministic fixtures/stubs;
- pure resolver score tests with positive, negative, and conflicting candidates;
- mapping tests for every target schema version;
- JSON Schema and business-rule gate tests;
- an assertion that adapters are never called on any failed preflight;
- happy-path API integration covering all three state mutations;
- drift-path integration proving zero mutations and a human-review state; and
- one browser test for the citizen result and technical trace.
