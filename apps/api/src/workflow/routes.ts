import type { Express } from "express";

import { WorkflowTraceResponseSchema } from "@omni-route/shared";

import { sendNotFound } from "../mock-systems/http.js";
import type { WorkflowOrchestrator } from "./orchestrator.js";

export function registerWorkflowExecutionRoutes(
  app: Express,
  orchestrator: WorkflowOrchestrator,
): void {
  app.post("/api/workflows/:workflowId/execute", async (request, response) => {
    const trace = await orchestrator.execute(request.params.workflowId);
    if (trace === undefined) return sendNotFound(response, "Canonical workflow was not found.");
    return response.status(200).json(WorkflowTraceResponseSchema.parse({ data: trace }));
  });
}
