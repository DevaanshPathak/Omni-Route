import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";

const seedPaths = [
  "court.records.v1.json",
  "registration.records.v1.json",
  "revenue.records.v1.json",
].map((filename) => fileURLToPath(new URL(`../../../data/seeds/${filename}`, import.meta.url)));

describe("synthetic government system routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it("looks up and updates a Court order using the Court contract", async () => {
    const initial = await request(app).get("/mock/court/orders/ORD-123").expect(200);

    expect(initial.body.data).toMatchObject({
      order_ref: "ORD-123",
      property_ref: "COURT-PROP-45",
      beneficiary: "Raju",
      decree_status: "ISSUED",
    });

    const updated = await request(app)
      .post("/mock/court/orders/ORD-123/dispatch")
      .send({
        property_ref: "COURT-PROP-45",
        beneficiary: "Raju",
        decree_status: "DISPATCHED",
      })
      .expect(200);

    expect(updated.body.data.decree_status).toBe("DISPATCHED");
    await request(app)
      .get("/mock/court/orders/ORD-123")
      .expect(200)
      .expect(({ body }) => expect(body.data.decree_status).toBe("DISPATCHED"));
  });

  it("looks up and updates a Registration record using its incompatible contract", async () => {
    await request(app)
      .get("/mock/registration/properties/REG-2391")
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toMatchObject({
          document_no: "SALE-7781",
          property_id: "REG-2391",
          buyer_name: "Anita Rao",
          instrument_type: "SALE",
        }),
      );

    const updated = await request(app)
      .post("/mock/registration/transfers")
      .send({
        document_no: "ORD-123",
        property_id: "REG-2391",
        buyer_name: "Raju",
        instrument_type: "COURT_ORDER",
      })
      .expect(200);

    expect(updated.body.data).toMatchObject({
      document_no: "ORD-123",
      buyer_name: "Raju",
      instrument_type: "COURT_ORDER",
    });
  });

  it("looks up and updates a Revenue record using a survey identifier", async () => {
    const surveyNumber = encodeURIComponent("45/2");

    await request(app)
      .get(`/mock/revenue/properties/${surveyNumber}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toMatchObject({
          survey_no: "45/2",
          owner_nm: "Anita Rao",
          mutation_required: false,
        }),
      );

    const updated = await request(app)
      .post("/mock/revenue/mutations")
      .send({ survey_no: "45/2", owner_nm: "Raju", mutation_required: true })
      .expect(200);

    expect(updated.body.data).toMatchObject({
      survey_no: "45/2",
      owner_nm: "Raju",
      mutation_required: true,
    });
  });

  it("rejects a payload from another system without mutating the target", async () => {
    await request(app)
      .post("/mock/registration/transfers")
      .send({
        property_ref: "COURT-PROP-45",
        beneficiary: "Raju",
        decree_status: "DISPATCHED",
      })
      .expect(400)
      .expect(({ body }) => expect(body.error.code).toBe("INVALID_REQUEST"));

    await request(app)
      .get("/mock/registration/properties/REG-2391")
      .expect(200)
      .expect(({ body }) => expect(body.data.buyer_name).toBe("Anita Rao"));
  });

  it("returns a contract error for malformed JSON", async () => {
    await request(app)
      .post("/mock/revenue/mutations")
      .set("content-type", "application/json")
      .send('{"survey_no":')
      .expect(400)
      .expect(({ body, headers }) => {
        expect(headers["content-type"]).toContain("application/json");
        expect(body.error).toEqual({
          code: "INVALID_REQUEST",
          message: "Request body contained invalid JSON.",
        });
      });
  });

  it("returns a consistent not-found error for an unknown record", async () => {
    await request(app)
      .get("/mock/court/orders/ORD-MISSING")
      .expect(404)
      .expect(({ body }) => {
        expect(body.error).toEqual({
          code: "NOT_FOUND",
          message: "Court order was not found.",
        });
      });
  });

  it("resets all mutable systems to their original logical state", async () => {
    const courtBefore = (await request(app).get("/mock/court/orders/ORD-123")).body.data;
    const registrationBefore = (await request(app).get("/mock/registration/properties/REG-2391"))
      .body.data;
    const revenueBefore = (
      await request(app).get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`)
    ).body.data;

    await request(app)
      .post("/mock/court/orders/ORD-123/dispatch")
      .send({
        property_ref: "COURT-PROP-45",
        beneficiary: "Raju",
        decree_status: "DISPATCHED",
      })
      .expect(200);
    await request(app)
      .post("/mock/registration/transfers")
      .send({
        document_no: "ORD-123",
        property_id: "REG-2391",
        buyer_name: "Raju",
        instrument_type: "COURT_ORDER",
      })
      .expect(200);
    await request(app)
      .post("/mock/revenue/mutations")
      .send({ survey_no: "45/2", owner_nm: "Raju", mutation_required: true })
      .expect(200);

    await request(app)
      .post("/mock/reset")
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual({
          status: "reset",
          systems: ["court", "registration", "revenue"],
        });
      });

    expect((await request(app).get("/mock/court/orders/ORD-123")).body.data).toEqual(courtBefore);
    expect((await request(app).get("/mock/registration/properties/REG-2391")).body.data).toEqual(
      registrationBefore,
    );
    expect(
      (await request(app).get(`/mock/revenue/properties/${encodeURIComponent("45/2")}`)).body.data,
    ).toEqual(revenueBefore);
  });

  it("never rewrites any committed seed file", async () => {
    const before = await Promise.all(seedPaths.map((path) => readFile(path, "utf8")));

    await request(app)
      .post("/mock/court/orders/ORD-123/dispatch")
      .send({
        property_ref: "COURT-PROP-45",
        beneficiary: "Raju",
        decree_status: "DISPATCHED",
      })
      .expect(200);
    await request(app).post("/mock/reset").expect(200);

    expect(await Promise.all(seedPaths.map((path) => readFile(path, "utf8")))).toEqual(before);
  });
});
