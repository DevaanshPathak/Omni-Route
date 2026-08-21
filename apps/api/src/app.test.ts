import request from "supertest";
import { describe, expect, it } from "vitest";

import { HealthResponseSchema } from "@omni-route/shared";

import { createApp } from "./app.js";

describe("GET /health", () => {
  it("returns a schema-valid API health response", async () => {
    const response = await request(createApp()).get("/health").expect(200);
    const health = HealthResponseSchema.parse(response.body);

    expect(health).toMatchObject({
      service: "omni-route-api",
      status: "ok",
      version: "0.1.0",
    });
  });
});
