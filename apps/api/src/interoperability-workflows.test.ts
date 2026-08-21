import { readFile } from "node:fs/promises";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { WorkflowTraceResponseSchema } from "@omni-route/shared";

import { createApp } from "./app.js";

const decreeUrl = new URL(
  "../../../fixtures/documents/court-decree-ownership-transfer.txt",
  import.meta.url,
);

describe("Phase 4 workflow planning API", () => {
  it("returns an inspectable, non-executable Semantic Action Graph", async () => {
    const app = createApp();
    const decree = await readFile(decreeUrl, "utf8");
    const created = await request(app)
      .post("/api/workflows")
      .send({ synthetic: true, provider: "fixture", input: { kind: "text", text: decree } })
      .expect(201);

    const planned = await request(app)
      .post(`/api/workflows/${created.body.data.workflow.id}/plan`)
      .expect(200);
    const trace = WorkflowTraceResponseSchema.parse(planned.body).data;

    expect(trace.workflow.workflow.currentState).toBe("MAPPING");
    expect(trace.graph.status).toBe("PENDING_VALIDATION");
    expect(trace.graph.actions.every((action) => action.execution.status === "NOT_STARTED")).toBe(
      true,
    );
    expect(trace.graph.actions.map((action) => action.entityMatch.score)).toEqual([1, 1, 1]);
  });

  it("exposes the stored plan and clears it on demo reset", async () => {
    const app = createApp();
    const decree = await readFile(decreeUrl, "utf8");
    const created = await request(app)
      .post("/api/workflows")
      .send({ synthetic: true, provider: "fixture", input: { kind: "text", text: decree } });
    const workflowId = created.body.data.workflow.id;
    await request(app).post(`/api/workflows/${workflowId}/plan`).expect(200);
    await request(app).get(`/api/workflows/${workflowId}/trace`).expect(200);
    await request(app).post("/api/demo/reset").expect(200);
    await request(app).get(`/api/workflows/${workflowId}/trace`).expect(404);
  });
});
