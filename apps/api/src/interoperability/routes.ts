import type { Express } from "express";

import { ApiErrorResponseSchema, WorkflowTraceResponseSchema } from "@omni-route/shared";

import { sendNotFound } from "../mock-systems/http.js";
import type { PlanningService } from "./planning-service.js";

export function registerInteroperabilityRoutes(app: Express, planning: PlanningService): void {
  app.post("/api/workflows/:workflowId/plan", (request, response) => {
    try {
      const trace = planning.plan(request.params.workflowId);
      if (trace === undefined) return sendNotFound(response, "Canonical workflow was not found.");
      return response.status(200).json(WorkflowTraceResponseSchema.parse({ data: trace }));
    } catch {
      return response.status(409).json(
        ApiErrorResponseSchema.parse({
          error: {
            code: "INVALID_REQUEST",
            message: "Workflow cannot be planned from its current state.",
          },
        }),
      );
    }
  });

  app.get("/api/workflows/:workflowId/trace", (request, response) => {
    const trace = planning.getTrace(request.params.workflowId);
    if (trace === undefined) return sendNotFound(response, "Workflow trace was not found.");
    return response.status(200).json(WorkflowTraceResponseSchema.parse({ data: trace }));
  });
}
