import { describe, expect, it } from "vitest";

import { HealthResponseSchema } from "./health.js";

describe("HealthResponseSchema", () => {
  it("accepts the API health contract", () => {
    expect(
      HealthResponseSchema.parse({
        service: "omni-route-api",
        status: "ok",
        version: "0.1.0",
        timestamp: "2026-08-21T04:00:00.000Z",
      }),
    ).toMatchObject({ service: "omni-route-api", status: "ok" });
  });

  it("rejects an unknown status", () => {
    expect(() =>
      HealthResponseSchema.parse({
        service: "omni-route-api",
        status: "degraded",
        version: "0.1.0",
        timestamp: "2026-08-21T04:00:00.000Z",
      }),
    ).toThrow();
  });
});
