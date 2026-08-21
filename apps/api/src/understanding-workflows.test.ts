import { readFile } from "node:fs/promises";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { CanonicalWorkflowResponseSchema } from "@omni-route/shared";

import { createApp } from "./app.js";
import { UnderstandingError, type UnderstandingProvider } from "./understanding/service.js";

const decreeUrl = new URL(
  "../../../fixtures/documents/court-decree-ownership-transfer.txt",
  import.meta.url,
);

describe("POST /api/workflows understanding boundary", () => {
  it("extracts the supported synthetic text with the deterministic provider", async () => {
    const app = createApp();
    const decree = await readFile(decreeUrl, "utf8");
    const response = await request(app)
      .post("/api/workflows")
      .send({ synthetic: true, provider: "fixture", input: { kind: "text", text: decree } })
      .expect(201);
    const view = CanonicalWorkflowResponseSchema.parse(response.body).data;

    expect(view.workflow.currentState).toBe("UNDERSTANDING_COMPLETE");
    expect(view.event).toMatchObject({
      effectiveOwner: { name: "Raju" },
      property: { declaredReference: "45" },
      legalOrder: { reference: "ORD-123" },
      interpretation: { promptVersion: "property-transfer-extraction.v1", provider: "fixture" },
    });
  });

  it("accepts extracted text from the supported plain-text document path", async () => {
    const decree = await readFile(decreeUrl, "utf8");
    await request(createApp())
      .post("/api/workflows")
      .send({
        synthetic: true,
        provider: "fixture",
        input: {
          kind: "document",
          filename: "court-decree-ownership-transfer.txt",
          contentType: "text/plain",
          text: decree,
        },
      })
      .expect(201)
      .expect(({ body }) => expect(body.data.event.legalOrder.source).toBe("synthetic_upload"));
  });

  it("rejects invalid input with bounded contract details", async () => {
    await request(createApp())
      .post("/api/workflows")
      .send({
        synthetic: true,
        input: {
          kind: "document",
          filename: "decree.pdf",
          contentType: "application/pdf",
          text: "Not a supported synthetic text document.",
        },
      })
      .expect(400)
      .expect(({ body }) => expect(body.error.code).toBe("INVALID_REQUEST"));
  });

  it("returns safe provider errors and creates no inspectable workflow", async () => {
    const provider: UnderstandingProvider = {
      id: "openai",
      model: "configured-model",
      extract: async () => {
        throw new UnderstandingError("PROVIDER_TIMEOUT", "The extraction provider timed out.");
      },
    };
    const app = createApp({ understandingProvider: provider });

    await request(app)
      .post("/api/workflows")
      .send({
        synthetic: true,
        input: { kind: "text", text: "A synthetic decree with deliberately private body text." },
      })
      .expect(504)
      .expect(({ body }) => {
        expect(body.error.code).toBe("PROVIDER_TIMEOUT");
        expect(JSON.stringify(body)).not.toContain("deliberately private body text");
      });
    await request(app).get("/api/workflows/WRK-000001").expect(404);
  });

  it("does not mutate any departmental record during understanding", async () => {
    const app = createApp();
    const decree = await readFile(decreeUrl, "utf8");
    const before = await request(app).get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`);

    await request(app)
      .post("/api/workflows")
      .send({ synthetic: true, provider: "fixture", input: { kind: "text", text: decree } })
      .expect(201);

    const after = await request(app).get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`);
    expect(after.body).toEqual(before.body);
  });
});
