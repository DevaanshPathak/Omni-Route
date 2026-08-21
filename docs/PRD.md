# Product Requirements Document

- **Product:** Omni-Route
- **Status:** Hackathon MVP plan
- **Hackathon:** Build What Moves India
- **Primary workflow:** Property ownership transfer following a synthetic court decree

## 1. Executive summary

Citizens experience one real-world event, while government infrastructure may represent that event across departments with different identifiers, field names, and workflows. Omni-Route lets a citizen submit the event once and handles that mismatch behind one journey.

For this MVP, a citizen uploads or describes a synthetic court decree transferring a property to a new owner. Omni-Route extracts a canonical event, finds corresponding records in three synthetic systems, builds a Semantic Action Graph, maps the event into each system's schema, validates every proposed action, executes the safe actions against mock APIs, verifies the results, and returns one unified outcome.

The product thesis is:

> One citizen intent becomes one Semantic Action Graph and a set of deterministically validated actions across disconnected systems.

## 2. Product principles

### Citizen intent before departmental complexity

The citizen describes what happened. They do not choose departments, APIs, schemas, or identifier types.

### One input, multiple systems

The same supplied evidence is reused throughout the workflow rather than requested once per department.

### Canonical meaning before target fields

Person, property, legal order, and event concepts are represented independently of departmental schemas. Target field names do not leak into the canonical model.

### AI proposes; deterministic systems validate

The LLM may extract an event and evidence from an input. It cannot authorize a workflow, choose to bypass a failed rule, call a departmental adapter, or mutate state. Deterministic entity scoring, mapping rules, schema validation, business rules, confidence thresholds, and execution policy form the gate.

### Fail closed

An ambiguous entity, conflicting identifier, unknown field, invalid payload, or insufficient confidence blocks execution and produces a human-review result. The system never invents an identifier or silently accepts schema drift.

### Evidence is visible

The technical view shows source evidence, matches, field mappings, confidence, validation outcomes, adapter requests, responses, and a workflow ID. The citizen view stays outcome-focused.

## 3. MVP user journey

### Persona and input

A citizen has a synthetic court decree stating that ownership of property 45 is transferred to Raju. They upload the document or paste its text.

### Expected journey

1. Omni-Route accepts the synthetic document or text.
2. OpenAI returns a schema-constrained canonical ownership-transfer event.
3. Deterministic routing selects Court, Registration, and Revenue.
4. The resolver scores seeded candidate records using declared evidence.
5. The mapper builds three target actions from versioned schema metadata.
6. The system displays the Semantic Action Graph and confidence evidence.
7. Deterministic checks validate all actions before any adapter executes.
8. The orchestrator calls the three mock APIs and verifies their responses.
9. The citizen receives one completed, blocked, failed, or partially completed result.
10. The technical trace records the entire workflow under one ID.

The happy path should be understandable to a judge within about 30 seconds and fully demonstrated in 60–90 seconds.

## 4. Semantic Action Graph

The Semantic Action Graph is the central product artifact between interpretation and execution.

```text
Canonical event
  ├─ canonical entities and source evidence
  ├─ Court action
  │    └─ mappings, confidence, validation state
  ├─ Registration action
  │    └─ mappings, confidence, validation state
  └─ Revenue action
       └─ mappings, confidence, validation state
              ↓
       deterministic execution gate
```

The graph is inspectable but not itself authorization. Only the deterministic gate can make its actions executable.

## 5. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-01 | Accept synthetic court-decree text and a browser-uploaded demo document. |
| FR-02 | Extract a schema-constrained canonical event containing person, property, legal-order, event type, and source evidence. |
| FR-03 | Select Court, Registration, and Revenue for the supported ownership-transfer event using deterministic routing. |
| FR-04 | Load versioned machine-readable schemas and seeded records for all three synthetic systems. |
| FR-05 | Resolve equivalent records with a deterministic weighted scoring function and expose score components. |
| FR-06 | Build a Semantic Action Graph with target operations, field mappings, evidence, confidence, and validation state. |
| FR-07 | Produce target payloads only through declared canonical-to-target mapping rules. |
| FR-08 | Validate entity consistency, mapping confidence, JSON Schema conformance, business rules, and execution policy before execution. |
| FR-09 | Execute only fully validated actions against the three mock APIs. |
| FR-10 | Verify adapter responses and report `COMPLETED`, `BLOCKED`, `FAILED`, or `PARTIALLY_COMPLETED`. |
| FR-11 | Record an in-memory audit trace with workflow ID, input metadata, extraction, evidence, mappings, checks, requests, responses, and final state. |
| FR-12 | Provide a simple citizen view and an expandable technical trace. |
| FR-13 | Detect the required Revenue schema-drift fixture and block unsafe execution. |
| FR-14 | Reset mutable demo state so both scenarios can be repeated locally. |

## 6. Non-functional requirements

- **Safety:** no LLM output reaches an adapter without deterministic validation.
- **Reliability:** predefined happy-path and failure-path fixtures run repeatedly without manual data repair.
- **Explainability:** every score, mapping, validation result, and action is traceable.
- **Performance:** the complete local demonstration finishes comfortably within four minutes; no unsupported latency claim is part of acceptance.
- **Privacy:** use only synthetic inputs and records; do not commit API keys or uploaded runtime files.
- **Simplicity:** one local command starts the implemented prototype after Phase 0.

## 7. Schema-drift failure demo

The committed Revenue schema initially requires:

```text
person.name → owner_nm
```

The drift fixture replaces `owner_nm` with `registered_owner` without adding an approved mapping rule.

On re-running the workflow, Omni-Route must:

1. detect that the approved target field is absent or incompatible;
2. show `registered_owner` only as an unapproved/low-confidence candidate, if a candidate is displayed;
3. report a confidence below the automatic-execution threshold;
4. mark the Revenue action and whole workflow `BLOCKED` / `HUMAN_REVIEW_REQUIRED` before any mock update occurs;
5. show the expected field, available field, reason, score, and audit event; and
6. prove that all three synthetic systems remain unchanged for that run.

For the demo fixture, the displayed candidate confidence is `0.61`; the automatic threshold is `0.90`. These values are deterministic fixture behavior, not model self-confidence.

## 8. Non-goals

- Connecting to or modifying live government systems or real citizen records
- Legal interpretation, entitlement decisions, or production authorization policy
- Production identity, authentication, authorization, rate limiting, or API-gateway infrastructure
- PostgreSQL, Redis, queues, distributed transactions, or durable workflow recovery
- A learned/ML entity-resolution service
- General-purpose autonomous agents or direct LLM tool execution
- Multiple domains or workflows beyond the single property-transfer demonstration
- Production OCR coverage, document retention, or scale guarantees

## 9. Acceptance criteria

### Happy path

- [ ] A citizen can submit the supplied synthetic decree as text or an accepted demo document.
- [ ] Extraction returns the expected ownership-transfer event, person, property, order, and evidence.
- [ ] Deterministic routing selects Court, Registration, and Revenue.
- [ ] The resolver links the intended seeded records and shows weighted evidence.
- [ ] The technical view shows one Semantic Action Graph and three incompatible target schemas.
- [ ] Every target payload passes entity, mapping, JSON Schema, business-rule, and policy checks.
- [ ] Only after all pre-execution checks pass do all three mock APIs update their in-memory state.
- [ ] Responses are verified and the workflow finishes `COMPLETED`.
- [ ] The citizen sees one result and the technical trace shows a workflow ID and all material decisions.

### Safe failure

- [ ] The Revenue drift fixture renames `owner_nm` to `registered_owner`.
- [ ] The approved mapping no longer validates and the deterministic candidate score is `0.61`, below `0.90`.
- [ ] The entire workflow is blocked before adapter execution and marked for human review.
- [ ] No synthetic system state changes during the blocked run.
- [ ] The audit trace explains the mismatch and failed gate.

### Demo quality

- [ ] Mutable state can be reset between runs.
- [ ] Both paths work locally and repeatably.
- [ ] No live government endpoint, production database, or real record is used.
- [ ] The complete presentation runs in under four minutes.

## 10. Demo script summary

1. Explain that one citizen event currently becomes multiple disconnected transactions.
2. Upload the synthetic decree.
3. Show the extracted canonical event and the three selected systems.
4. Open the Semantic Action Graph; point out different identifiers and field names.
5. Run deterministic validation and execute the happy path.
6. Show the unified result and audit trace.
7. Enable the Revenue schema-drift fixture and run again.
8. Show the blocked gate, `0.61` score, human-review state, and unchanged systems.
9. Close on the separation between probabilistic interpretation and deterministic execution.

The spoken click-through is maintained in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

## 11. Future extensions

After the hackathon, possible work includes additional workflows, regional-language interaction, real identity and authorization integration, governed schema versioning, durable storage, and human-review operations. None belongs to this MVP unless scope is explicitly changed.
