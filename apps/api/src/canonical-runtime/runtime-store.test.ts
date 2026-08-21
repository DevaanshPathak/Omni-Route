import { describe, expect, it } from "vitest";

import type { CanonicalEvent } from "@omni-route/shared";

import { CanonicalRuntimeStore } from "./runtime-store.js";

const event: CanonicalEvent = {
  id: "EVT-0001",
  type: "PROPERTY_OWNERSHIP_TRANSFER",
  effectiveOwner: { id: "PER-0001", name: "Raju" },
  property: { id: "PRO-0001", declaredReference: "45" },
  legalOrder: {
    id: "DOC-0001",
    type: "COURT_DECREE",
    reference: "ORD-123",
    source: "synthetic_text",
    evidence: [{ source: "DOC-0001", field: "legal_order.reference", value: "ORD-123" }],
  },
  interpretation: {
    provider: "fixture",
    model: "fixture-v1",
    promptVersion: "property-transfer-extraction.v1",
  },
  evidence: [{ source: "DOC-0001", field: "effective_owner.name", value: "Raju" }],
};

const fixedClock = () => new Date("2026-08-21T04:30:00.000Z");

describe("CanonicalRuntimeStore", () => {
  it("generates stable workflow IDs and resets the sequence", () => {
    const store = new CanonicalRuntimeStore(fixedClock);

    expect(store.createWorkflow(event).workflow.id).toBe("WRK-000001");
    expect(store.createWorkflow(event).workflow.id).toBe("WRK-000002");

    store.reset();
    expect(store.createWorkflow(event).workflow.id).toBe("WRK-000001");
  });

  it("stores canonical entities independently and returns defensive copies", () => {
    const store = new CanonicalRuntimeStore(fixedClock);
    store.createWorkflow(event);

    const person = store.getPerson("PER-0001");
    expect(person).toEqual(event.effectiveOwner);
    if (person === undefined) throw new Error("Expected canonical person");
    person.name = "Changed by caller";

    expect(store.getPerson("PER-0001")?.name).toBe("Raju");
    expect(store.getProperty("PRO-0001")).toEqual(event.property);
    expect(store.getDocument("DOC-0001")).toEqual(event.legalOrder);
    expect(store.getEvent("EVT-0001")).toEqual(event);
  });

  it("allows only ordered workflow state transitions", () => {
    const store = new CanonicalRuntimeStore(fixedClock);
    const created = store.createWorkflow(event);

    const extracting = store.transitionWorkflow(created.workflow.id, "EXTRACTING");
    expect(extracting.currentState).toBe("EXTRACTING");
    expect(extracting.transitions.map(({ to }) => to)).toEqual(["RECEIVED", "EXTRACTING"]);
    expect(() => store.transitionWorkflow(created.workflow.id, "EXECUTING")).toThrow(
      /Invalid workflow transition/,
    );
  });

  it("keeps audit events append-only, ordered, and isolated from caller mutation", () => {
    const store = new CanonicalRuntimeStore(fixedClock);
    const workflowId = store.createWorkflow(event).workflow.id;
    store.transitionWorkflow(workflowId, "EXTRACTING");

    const firstRead = store.getWorkflowView(workflowId);
    expect(firstRead?.auditEvents.map(({ sequence }) => sequence)).toEqual([1, 2]);
    if (firstRead === undefined) throw new Error("Expected workflow view");
    firstRead.auditEvents[0]!.summary = "tampered";

    expect(store.getWorkflowView(workflowId)?.auditEvents[0]?.summary).toBe(
      "Canonical workflow created.",
    );
  });

  it("stores graph snapshots and validation results in append order", () => {
    const store = new CanonicalRuntimeStore(fixedClock);
    const workflowId = store.createWorkflow(event).workflow.id;

    store.appendGraphSnapshot(workflowId, {
      id: "SAG-000001",
      workflowId,
      revision: 1,
      capturedAt: fixedClock().toISOString(),
      eventId: event.id,
      nodes: [{ id: event.id, kind: "EVENT", label: "Ownership transfer", state: "PENDING" }],
      edges: [],
    });
    store.appendValidationResult(workflowId, {
      id: "VAL-000001",
      workflowId,
      ruleId: "canonical.shape",
      outcome: "PASS",
      reason: "Fixture passed canonical validation.",
      evidence: event.evidence,
      checkedAt: fixedClock().toISOString(),
    });

    const view = store.getWorkflowView(workflowId);
    expect(view?.graphSnapshots.map(({ revision }) => revision)).toEqual([1]);
    expect(view?.validationResults.map(({ ruleId }) => ruleId)).toEqual(["canonical.shape"]);
    expect(view?.auditEvents.map(({ sequence }) => sequence)).toEqual([1, 2, 3]);
  });
});
