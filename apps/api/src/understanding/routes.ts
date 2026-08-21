import type { Express } from "express";

import { CanonicalWorkflowResponseSchema, UnderstandingRequestSchema } from "@omni-route/shared";

import { sendApiError, sendInvalidRequest } from "../mock-systems/http.js";
import { UnderstandingError, type UnderstandingService } from "./service.js";

const statusByErrorCode = {
  MISSING_CONFIGURATION: 503,
  PROVIDER_FAILURE: 502,
  PROVIDER_REFUSAL: 422,
  PROVIDER_TIMEOUT: 504,
  INVALID_MODEL_OUTPUT: 502,
  UNSUPPORTED_FIXTURE_INPUT: 422,
} as const;

export function registerUnderstandingRoutes(app: Express, service: UnderstandingService): void {
  app.post("/api/workflows", async (request, response) => {
    const parsed = UnderstandingRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendInvalidRequest(response, "understanding request", parsed.error);
      return;
    }

    try {
      const view = await service.createWorkflow(parsed.data);
      response.status(201).json(CanonicalWorkflowResponseSchema.parse({ data: view }));
    } catch (error) {
      if (error instanceof UnderstandingError) {
        sendApiError(response, statusByErrorCode[error.code], error.code, error.message);
        return;
      }
      throw error;
    }
  });
}
