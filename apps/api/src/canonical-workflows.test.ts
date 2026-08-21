import request from "supertest";
import { describe, expect, it } from "vitest";

import { CanonicalWorkflowResponseSchema } from "@omni-route/shared";

import { createApp } from "./app.js";

describe("fixture-backed canonical workflow API", () => {
  it("creates and inspects a canonical workflow with no departmental fields", async () => {
    const app = createApp();
    const created = await request(app).post("/api/demo/canonical-workflows").expect(201);
    const view = CanonicalWorkflowResponseSchema.parse(created.body).data;

    expect(view.workflow).toMatchObject({ id: "WRK-000001", currentState: "RECEIVED" });
    expect(view.event).toMatchObject({
      type: "PROPERTY_OWNERSHIP_TRANSFER",
      effectiveOwner: { name: "Raju" },
      property: { declaredReference: "45" },
      legalOrder: { reference: "ORD-123" },
    });
    expect(JSON.stringify(view.event)).not.toMatch(
      /property_ref|property_id|survey_no|beneficiary|buyer_name|owner_nm/,
    );

    await request(app)
      .get(`/api/workflows/${view.workflow.id}`)
      .expect(200)
      .expect(({ body }) => expect(CanonicalWorkflowResponseSchema.parse(body).data).toEqual(view));
  });

  it("returns not found for an unknown canonical workflow", async () => {
    await request(createApp())
      .get("/api/workflows/WRK-999999")
      .expect(404)
      .expect(({ body }) => expect(body.error.code).toBe("NOT_FOUND"));
  });

  it("resets canonical IDs and mock-system mutations together", async () => {
    const app = createApp();
    await request(app).post("/api/demo/canonical-workflows").expect(201);
    await request(app)
      .post("/mock/revenue/mutations")
      .send({ survey_no: "45/2", owner_nm: "Raju", mutation_required: true })
      .expect(200);

    await request(app).post("/api/demo/reset").expect(200);

    await request(app)
      .get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.owner_nm).toBe("Anita Rao"));
    await request(app)
      .post("/api/demo/canonical-workflows")
      .expect(201)
      .expect(({ body }) => expect(body.data.workflow.id).toBe("WRK-000001"));
  });

  it("keeps the existing mock reset compatible while clearing canonical state", async () => {
    const app = createApp();
    const created = await request(app).post("/api/demo/canonical-workflows").expect(201);

    await request(app).post("/mock/reset").expect(200);
    await request(app).get(`/api/workflows/${created.body.data.workflow.id}`).expect(404);
    await request(app)
      .post("/api/demo/canonical-workflows")
      .expect(201)
      .expect(({ body }) => expect(body.data.workflow.id).toBe("WRK-000001"));
  });
});
