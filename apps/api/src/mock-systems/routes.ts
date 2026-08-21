import type { Express } from "express";

import { ResetResponseSchema } from "@omni-route/shared";

import { createCourtRouter } from "./court-router.js";
import { createRegistrationRouter } from "./registration-router.js";
import { createRevenueRouter } from "./revenue-router.js";
import type { MockSystemStores } from "./stores.js";

export function registerMockSystemRoutes(app: Express, stores: MockSystemStores): void {
  app.use("/mock/court", createCourtRouter(stores.court));
  app.use("/mock/registration", createRegistrationRouter(stores.registration));
  app.use("/mock/revenue", createRevenueRouter(stores.revenue));

  app.post("/mock/reset", (_request, response) => {
    stores.reset();
    response.status(200).json(
      ResetResponseSchema.parse({
        data: {
          status: "reset",
          systems: ["court", "registration", "revenue"],
        },
      }),
    );
  });
}
