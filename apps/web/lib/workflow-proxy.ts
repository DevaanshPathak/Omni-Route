import { ApiErrorResponseSchema, WorkflowTraceResponseSchema } from "@omni-route/shared";
import { NextResponse } from "next/server";

import { backendUrl, readJson, safeProxyError } from "./backend";

const workflowIdPattern = /^WRK-[A-Z0-9]+$/;

export async function proxyWorkflowOperation(workflowId: string, operation: "plan" | "execute") {
  if (!workflowIdPattern.test(workflowId)) {
    return safeProxyError(400, "Workflow ID is invalid.");
  }
  try {
    const response = await fetch(backendUrl(`/api/workflows/${workflowId}/${operation}`), {
      method: "POST",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    const body = await readJson(response);
    if (!response.ok) {
      const parsedError = ApiErrorResponseSchema.safeParse(body);
      return parsedError.success
        ? NextResponse.json(parsedError.data, { status: response.status })
        : safeProxyError(response.status, `Workflow ${operation} returned an unexpected error.`);
    }
    const parsed = WorkflowTraceResponseSchema.safeParse(body);
    return parsed.success
      ? NextResponse.json(parsed.data)
      : safeProxyError(502, `Workflow ${operation} returned an invalid trace.`);
  } catch {
    return safeProxyError();
  }
}
