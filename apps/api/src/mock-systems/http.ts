import type { Response } from "express";
import type { ZodError } from "zod";

import { ApiErrorResponseSchema, type UnderstandingErrorCode } from "@omni-route/shared";

export function sendInvalidRequest(
  response: Response,
  contractName: string,
  error: ZodError,
): Response {
  const body = ApiErrorResponseSchema.parse({
    error: {
      code: "INVALID_REQUEST",
      message: `Request body did not match the ${contractName} contract.`,
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  });

  return response.status(400).json(body);
}

export function sendNotFound(response: Response, message: string): Response {
  return response.status(404).json(
    ApiErrorResponseSchema.parse({
      error: { code: "NOT_FOUND", message },
    }),
  );
}

export function sendApiError(
  response: Response,
  status: number,
  code: UnderstandingErrorCode,
  message: string,
): Response {
  return response.status(status).json(
    ApiErrorResponseSchema.parse({
      error: { code, message },
    }),
  );
}
