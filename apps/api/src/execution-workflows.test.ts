import { readFile } from "node:fs/promises";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { WorkflowTraceResponseSchema, type CanonicalEventProposal } from "@omni-route/shared";

import { createApp } from "./app.js";
import { loadInteroperabilityRegistry } from "./interoperability/registry.js";
import { createMockSystemStores } from "./mock-systems/stores.js";
import { createDepartmentAdapters, type DepartmentAdapters } from "./workflow/adapters.js";
import type { UnderstandingProvider } from "./understanding/service.js";

const decreeUrl = new URL(
  "../../../fixtures/documents/court-decree-ownership-transfer.txt",
  import.meta.url,
);

async function createFixtureWorkflow(app: ReturnType<typeof createApp>) {
  const decree = await readFile(decreeUrl, "utf8");
  return request(app)
    .post("/api/workflows")
    .send({ synthetic: true, provider: "fixture", input: { kind: "text", text: decree } })
    .expect(201);
}

describe("Phase 5 deterministic workflow execution", () => {
  it("preflights, executes, verifies, and audits all three synthetic actions", async () => {
    const app = createApp();
    const created = await createFixtureWorkflow(app);
    const workflowId = created.body.data.workflow.id;

    const response = await request(app).post(`/api/workflows/${workflowId}/execute`).expect(200);
    const trace = WorkflowTraceResponseSchema.parse(response.body).data;

    expect(trace.workflow.workflow.currentState).toBe("COMPLETED");
    expect(trace.graph.status).toBe("COMPLETED");
    expect(
      trace.graph.actions.every((action) =>
        action.validation.every((rule) => rule.outcome === "PASS"),
      ),
    ).toBe(true);
    expect(trace.graph.actions.every((action) => action.execution.status === "VERIFIED")).toBe(
      true,
    );
    expect(trace.workflow.auditEvents.some((event) => event.type === "ACTION_EXECUTED")).toBe(true);
    expect(trace.workflow.auditEvents.some((event) => event.type === "ACTION_VERIFIED")).toBe(true);
    await request(app)
      .get("/mock/court/orders/ORD-123")
      .expect(({ body }) => expect(body.data.decree_status).toBe("DISPATCHED"));
    await request(app)
      .get("/mock/registration/properties/REG-2391")
      .expect(({ body }) => expect(body.data.buyer_name).toBe("Raju"));
    await request(app)
      .get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`)
      .expect(({ body }) => expect(body.data.owner_nm).toBe("Raju"));
  });

  it("blocks a conflicting identifier before any adapter call", async () => {
    const proposal: CanonicalEventProposal = {
      eventType: "PROPERTY_OWNERSHIP_TRANSFER",
      ownerName: "Raju",
      property: {
        declaredReference: "45",
        surveyNumber: "45/3",
        village: "Sampige",
        district: "Bengaluru Rural",
      },
      legalOrderReference: "ORD-123",
      evidence: { ownerName: "Raju", propertyReference: "45", legalOrderReference: "ORD-123" },
    };
    const provider: UnderstandingProvider = {
      id: "fixture",
      model: "conflict-fixture",
      extract: async () => proposal,
    };
    const adapters: DepartmentAdapters = { execute: vi.fn(), verify: vi.fn() };
    const app = createApp({ understandingProvider: provider, adapters });
    const text =
      "Synthetic order ORD-123 transfers property 45, survey 45/3, in Sampige, Bengaluru Rural to Raju.";
    const created = await request(app)
      .post("/api/workflows")
      .send({ synthetic: true, provider: "fixture", input: { kind: "text", text } });
    const before = await request(app).get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`);

    const response = await request(app)
      .post(`/api/workflows/${created.body.data.workflow.id}/execute`)
      .expect(200);
    const trace = WorkflowTraceResponseSchema.parse(response.body).data;
    expect(trace.workflow.workflow.currentState).toBe("HUMAN_REVIEW_REQUIRED");
    expect(trace.graph.status).toBe("BLOCKED");
    expect(adapters.execute).not.toHaveBeenCalled();
    const after = await request(app).get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`);
    expect(after.body).toEqual(before.body);
  });

  it("requires an aggregate preflight pass before the first adapter call", async () => {
    const registry = loadInteroperabilityRegistry();
    const revenue = registry.actions.find((action) => action.system === "revenue")!;
    revenue.mappings = revenue.mappings.filter((mapping) => mapping.targetField !== "owner_nm");
    const adapters: DepartmentAdapters = { execute: vi.fn(), verify: vi.fn() };
    const app = createApp({ registry, adapters });
    const created = await createFixtureWorkflow(app);

    const response = await request(app)
      .post(`/api/workflows/${created.body.data.workflow.id}/execute`)
      .expect(200);
    const trace = WorkflowTraceResponseSchema.parse(response.body).data;

    expect(trace.workflow.workflow.currentState).toBe("HUMAN_REVIEW_REQUIRED");
    expect(trace.graph.status).toBe("BLOCKED");
    expect(
      trace.graph.actions
        .find((action) => action.system === "revenue")
        ?.validation.some((rule) => rule.ruleId === "GATE-MAPPING" && rule.outcome === "FAIL"),
    ).toBe(true);
    expect(adapters.execute).not.toHaveBeenCalled();
  });

  it("reports partial completion and stops after a runtime adapter failure", async () => {
    const execute = vi.fn(async (action: { system: string }) => {
      if (action.system === "registration") throw new Error("synthetic outage");
      return { ok: true };
    });
    const adapters: DepartmentAdapters = { execute, verify: vi.fn(() => true) };
    const app = createApp({ adapters });
    const created = await createFixtureWorkflow(app);

    const response = await request(app)
      .post(`/api/workflows/${created.body.data.workflow.id}/execute`)
      .expect(200);
    const trace = WorkflowTraceResponseSchema.parse(response.body).data;
    expect(trace.workflow.workflow.currentState).toBe("PARTIALLY_COMPLETED");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(trace.graph.actions.find((action) => action.system === "court")?.execution.status).toBe(
      "EXECUTED",
    );
    expect(
      trace.graph.actions.find((action) => action.system === "registration")?.execution.status,
    ).toBe("FAILED");
    expect(
      trace.graph.actions.find((action) => action.system === "revenue")?.execution.status,
    ).toBe("NOT_STARTED");
  });

  it("fails closed when an executed response cannot be verified", async () => {
    const adapters: DepartmentAdapters = {
      execute: vi.fn(async () => ({ synthetic: "response" })),
      verify: vi.fn(() => false),
    };
    const app = createApp({ adapters });
    const created = await createFixtureWorkflow(app);

    const response = await request(app)
      .post(`/api/workflows/${created.body.data.workflow.id}/execute`)
      .expect(200);
    const trace = WorkflowTraceResponseSchema.parse(response.body).data;

    expect(trace.workflow.workflow.currentState).toBe("FAILED");
    expect(trace.graph.status).toBe("FAILED");
    expect(trace.graph.actions.every((action) => action.execution.status === "FAILED")).toBe(true);
  });
});

describe("Phase 7 Revenue schema drift", () => {
  it("blocks the aggregate workflow with zero adapter calls and zero mutations", async () => {
    const adapters: DepartmentAdapters = { execute: vi.fn(), verify: vi.fn() };
    const app = createApp({ adapters });
    await request(app).post("/api/demo/schema").send({ mode: "revenue-drift" }).expect(200);
    const before = await request(app).get("/api/demo/systems").expect(200);
    const created = await createFixtureWorkflow(app);

    const response = await request(app)
      .post(`/api/workflows/${created.body.data.workflow.id}/execute`)
      .expect(200);
    const trace = WorkflowTraceResponseSchema.parse(response.body).data;
    const revenue = trace.graph.actions.find((action) => action.system === "revenue")!;

    expect(trace.workflow.workflow.currentState).toBe("HUMAN_REVIEW_REQUIRED");
    expect(trace.graph.status).toBe("BLOCKED");
    expect(revenue.mappingConflict).toEqual({
      expectedApprovedField: "owner_nm",
      availableUnapprovedField: "registered_owner",
      candidateConfidence: 0.61,
      requiredThreshold: 0.9,
    });
    expect(revenue.validation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "GATE-MAPPING", outcome: "FAIL" }),
        expect.objectContaining({ ruleId: "GATE-CONFIDENCE", outcome: "FAIL" }),
        expect.objectContaining({ ruleId: "GATE-JSON-SCHEMA", outcome: "FAIL" }),
      ]),
    );
    expect(adapters.execute).not.toHaveBeenCalled();
    expect(adapters.verify).not.toHaveBeenCalled();
    const after = await request(app).get("/api/demo/systems").expect(200);
    expect(after.body).toEqual(before.body);
  });

  it("runs happy then drift consecutively after scenario reset in one process", async () => {
    const stores = createMockSystemStores();
    const realAdapters = createDepartmentAdapters(stores);
    const execute = vi.fn(realAdapters.execute);
    const adapters: DepartmentAdapters = { execute, verify: realAdapters.verify };
    const app = createApp({ stores, adapters });

    const happy = await createFixtureWorkflow(app);
    const happyTrace = WorkflowTraceResponseSchema.parse(
      (await request(app).post(`/api/workflows/${happy.body.data.workflow.id}/execute`).expect(200))
        .body,
    ).data;
    expect(happyTrace.workflow.workflow.currentState).toBe("COMPLETED");
    expect(execute).toHaveBeenCalledTimes(3);

    await request(app).post("/api/demo/schema").send({ mode: "revenue-drift" }).expect(200);
    const drift = await createFixtureWorkflow(app);
    const driftTrace = WorkflowTraceResponseSchema.parse(
      (await request(app).post(`/api/workflows/${drift.body.data.workflow.id}/execute`).expect(200))
        .body,
    ).data;

    expect(driftTrace.workflow.workflow.currentState).toBe("HUMAN_REVIEW_REQUIRED");
    expect(execute).toHaveBeenCalledTimes(3);
    const snapshot = await request(app).get("/api/demo/systems").expect(200);
    expect(snapshot.body.data.court.decree_status).toBe("ISSUED");
    expect(snapshot.body.data.registration.buyer_name).toBe("Anita Rao");
    expect(snapshot.body.data.revenue.owner_nm).toBe("Anita Rao");
  });
});
