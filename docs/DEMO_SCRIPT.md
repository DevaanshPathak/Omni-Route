# Demo Script

Target duration: **2½–3 minutes**, with a hard ceiling of four minutes.

## Before presenting

- Start the web and API processes.
- Confirm the UI reports API health.
- Reset demo state to pristine seeds.
- Confirm the Revenue schema is on the baseline version using `owner_nm`.
- Keep the synthetic decree ready.
- Prefer live extraction; if network/API availability is uncertain, explicitly select the labeled deterministic demo mode before the presentation.
- Run both paths once on the presentation machine.

## Opening — 15 seconds

> A citizen experiences one real-world event, but government systems experience it as several disconnected transactions. Omni-Route lets the citizen describe that event once, then resolves, translates, validates, and routes the actions across the systems that need to know.

## Happy path — 60–90 seconds

### 1. Submit the decree

Upload the synthetic court decree or paste its text.

Say:

> This decree says that ownership of property 45 transfers to Raju. The citizen does not choose a department or fill three forms.

### 2. Show understanding

Pause on the extracted canonical event:

- event: property ownership transfer;
- person: Raju;
- property reference: 45; and
- court order: 123.

Say:

> OpenAI is used only here, to turn unstructured input into a schema-constrained proposal. It has no access to the departmental adapters.

### 3. Show system discovery

Point to Court, Registration, and Revenue.

Say:

> Deterministic routing knows this event requires three synthetic government actions.

### 4. Open the Semantic Action Graph

Point to one concept becoming distinct identifiers and fields:

```text
person.name  → beneficiary / buyer_name / owner_nm
property     → property_ref / property_id / survey_no
```

Show the resolver evidence and score components.

Say:

> This is more than routing JSON. Omni-Route establishes which records represent the same property, then applies approved mappings into incompatible contracts. Every score and mapping has visible evidence.

### 5. Validate and execute

Run the workflow. Point to entity, mapping, schema, business-rule, confidence, and policy checks before the adapter statuses change.

Say:

> The model cannot approve this. Deterministic checks validate every action first; only one aggregate pass opens the execution gate.

### 6. Show the result and trace

Pause on:

```text
Court ✓
Registration ✓
Revenue ✓
Workflow ID: WRK-…
```

Open the audit trace briefly to show mappings, validations, requests, responses, and verification.

Say:

> The citizen gets one outcome. The technical team gets a reproducible trace of why each action ran.

## Failure path — 30–40 seconds

Reset the demo, then enable the Revenue schema-drift fixture. Show that `owner_nm` has become `registered_owner` and run the same decree.

Pause on:

```text
Expected approved field: owner_nm
Available unapproved field: registered_owner
Candidate score: 61%
Required threshold: 90%
Execution: BLOCKED
Review: HUMAN_REVIEW_REQUIRED
```

Say:

> The Revenue contract changed, but the approved mapping did not. Omni-Route may recognize a plausible new field, yet plausibility is not authorization. The score is below policy, so it blocks the entire workflow before any system is changed.

Show the zero-adapter-call validation result or unchanged-record comparison.

> The important part is not that AI can suggest a mapping. It is that the system knows when a suggestion is not safe to execute.

## Architecture close — 15–20 seconds

Point to the boundary view:

```text
Citizen event
    ↓
probabilistic extraction
    ↓
canonical model
    ↓
deterministic resolve → map → validate → execute → verify → audit
```

Say:

> Existing interoperability infrastructure provides the pipes. Omni-Route provides the meaning and the controlled workflow above them. One citizen event becomes one validated result across every system that needs to act.

## Judge questions

### “Isn't this just an API gateway?”

> An API gateway authenticates, limits, and routes known requests. Omni-Route first resolves which differently identified records refer to the same real-world entity, translates a canonical event into incompatible schemas, and gates the resulting multi-system workflow. It could sit above an existing gateway.

### “Why do you need AI?”

> The citizen input is unstructured and departmental vocabulary varies. AI is useful for extracting a proposed canonical event and its evidence. Once that proposal exists, our MVP deliberately uses deterministic code for matching, mapping, validation, and execution.

### “What if the AI maps something incorrectly?”

> In this MVP the AI does not create executable target mappings. It only proposes the canonical event. Approved mapping rules, record evidence, JSON Schemas, business rules, and a 90% threshold gate execution. Any missing or conflicting requirement fails closed.

### “Why not standardize every government schema?”

> Standardization helps new systems, but legacy systems and departmental ownership do not disappear at once. Omni-Route demonstrates a canonical translation layer for systems that already disagree, without requiring a simultaneous rewrite.

### “Does this connect to real government systems?”

> No. The hackathon version uses fictional records and three local mock APIs. Real integration would require authoritative contracts, identity, authorization, legal policy, security review, durable audit, and departmental approval.

### “How is the 61% confidence calculated?”

> It is a deterministic fixture score from declared mapping evidence and penalties, not a model's self-reported confidence. The rules and threshold are visible in the trace, which makes the blocked decision repeatable.

### “What happens if the first update succeeds and the second fails?”

> Every action is preflighted before execution, which prevents known-invalid partial work. A runtime failure is still possible; the MVP stops, reports `PARTIALLY_COMPLETED`, and records exactly what ran. Production compensation and idempotent retries are intentionally outside this prototype.
