import type { Express } from "express";

import { CanonicalWorkflowResponseSchema, DemoResetResponseSchema } from "@omni-route/shared";

import { sendNotFound } from "../mock-systems/http.js";
import { loadCanonicalEventFixture } from "./fixture-loader.js";
import type { CanonicalRuntimeStore } from "./runtime-store.js";

export function registerCanonicalRuntimeRoutes(
  app: Express,
  store: CanonicalRuntimeStore,
  resetAll: () => void,
): void {
  app.post("/api/demo/canonical-workflows", (_request, response) => {
    const view = store.createWorkflow(loadCanonicalEventFixture());
    response.status(201).json(CanonicalWorkflowResponseSchema.parse({ data: view }));
  });

  app.get("/api/workflows/:workflowId", (request, response) => {
    const view = store.getWorkflowView(request.params.workflowId);
    if (view === undefined) {
      sendNotFound(response, "Canonical workflow was not found.");
      return;
    }
    response.status(200).json(CanonicalWorkflowResponseSchema.parse({ data: view }));
  });

  app.post("/api/demo/reset", (_request, response) => {
    resetAll();
    response.status(200).json(
      DemoResetResponseSchema.parse({
        data: {
          status: "reset",
          resources: ["canonical-runtime", "court", "registration", "revenue"],
        },
      }),
    );
  });
}
