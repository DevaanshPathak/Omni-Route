import type { Express } from "express";

import {
  ApiErrorResponseSchema,
  DemoSchemaModeRequestSchema,
  DemoSchemaStateResponseSchema,
  SyntheticSystemSnapshotResponseSchema,
} from "@omni-route/shared";

import type { ActiveRegistry } from "./interoperability/registry.js";
import type { MockSystemStores } from "./mock-systems/stores.js";

export function registerDemoRoutes(
  app: Express,
  stores: MockSystemStores,
  registry: ActiveRegistry,
  resetRuntime: () => void,
): void {
  app.get("/api/demo/schema", (_request, response) => {
    response.status(200).json(DemoSchemaStateResponseSchema.parse({ data: registry.state() }));
  });

  app.post("/api/demo/schema", (request, response) => {
    const parsed = DemoSchemaModeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json(
        ApiErrorResponseSchema.parse({
          error: {
            code: "INVALID_REQUEST",
            message: "Schema mode must be baseline or revenue-drift.",
          },
        }),
      );
      return;
    }
    resetRuntime();
    response
      .status(200)
      .json(DemoSchemaStateResponseSchema.parse({ data: registry.setMode(parsed.data.mode) }));
  });

  app.get("/api/demo/systems", (_request, response) => {
    const court = stores.court.get("ORD-123");
    const registration = stores.registration.get("REG-2391");
    const revenue = stores.revenue.get("45/2");
    if (court === undefined || registration === undefined || revenue === undefined) {
      response.status(500).json(
        ApiErrorResponseSchema.parse({
          error: { code: "INTERNAL_ERROR", message: "Synthetic demo records are unavailable." },
        }),
      );
      return;
    }
    response.status(200).json(
      SyntheticSystemSnapshotResponseSchema.parse({
        data: { court, registration, revenue, readOnly: true },
      }),
    );
  });
}
