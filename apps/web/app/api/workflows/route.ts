import {
  ApiErrorResponseSchema,
  CanonicalWorkflowResponseSchema,
  UnderstandingRequestSchema,
} from "@omni-route/shared";
import { NextResponse } from "next/server";

import { backendUrl, readJson, safeProxyError } from "../../../lib/backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return safeProxyError(400, "The extraction request must be valid JSON.");
  }

  const parsedRequest = UnderstandingRequestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return safeProxyError(
      400,
      "The synthetic decree must contain between 20 and 12,000 characters.",
    );
  }

  try {
    const response = await fetch(backendUrl("/api/workflows"), {
      method: "POST",
      cache: "no-store",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(parsedRequest.data),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await readJson(response);

    if (!response.ok) {
      const parsedError = ApiErrorResponseSchema.safeParse(body);
      return parsedError.success
        ? NextResponse.json(parsedError.data, { status: response.status })
        : safeProxyError(response.status, "The extraction service returned an unexpected error.");
    }

    const parsedResponse = CanonicalWorkflowResponseSchema.safeParse(body);
    return parsedResponse.success
      ? NextResponse.json(parsedResponse.data, { status: 201 })
      : safeProxyError(502, "The extraction service returned an invalid workflow.");
  } catch {
    return safeProxyError();
  }
}
