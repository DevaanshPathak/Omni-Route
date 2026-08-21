import {
  ApiErrorResponseSchema,
  DemoSchemaModeRequestSchema,
  DemoSchemaStateResponseSchema,
} from "@omni-route/shared";
import { NextResponse } from "next/server";

import { backendUrl, readJson, safeProxyError } from "../../../../lib/backend";

export const dynamic = "force-dynamic";

async function proxySchema(method: "GET" | "POST", body?: unknown) {
  try {
    const response = await fetch(backendUrl("/api/demo/schema"), {
      method,
      cache: "no-store",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const responseBody = await readJson(response);
    if (!response.ok) {
      const error = ApiErrorResponseSchema.safeParse(responseBody);
      return error.success
        ? NextResponse.json(error.data, { status: response.status })
        : safeProxyError(response.status, "The demo schema scenario could not be changed.");
    }
    const parsed = DemoSchemaStateResponseSchema.safeParse(responseBody);
    return parsed.success
      ? NextResponse.json(parsed.data)
      : safeProxyError(502, "The API returned an invalid schema scenario.");
  } catch {
    return safeProxyError();
  }
}

export async function GET() {
  return proxySchema("GET");
}

export async function POST(request: Request) {
  const parsed = DemoSchemaModeRequestSchema.safeParse(await request.json().catch(() => undefined));
  return parsed.success
    ? proxySchema("POST", parsed.data)
    : safeProxyError(400, "Schema mode must be baseline or revenue-drift.");
}
