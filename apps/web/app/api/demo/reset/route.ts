import { ApiErrorResponseSchema, DemoResetResponseSchema } from "@omni-route/shared";
import { NextResponse } from "next/server";

import { backendUrl, readJson, safeProxyError } from "../../../../lib/backend";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const response = await fetch(backendUrl("/api/demo/reset"), {
      method: "POST",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const body = await readJson(response);

    if (!response.ok) {
      const parsedError = ApiErrorResponseSchema.safeParse(body);
      return parsedError.success
        ? NextResponse.json(parsedError.data, { status: response.status })
        : safeProxyError(response.status, "The demo reset did not succeed.");
    }

    const parsedResponse = DemoResetResponseSchema.safeParse(body);
    return parsedResponse.success
      ? NextResponse.json(parsedResponse.data)
      : safeProxyError(502, "The demo reset returned an invalid response.");
  } catch {
    return safeProxyError();
  }
}
