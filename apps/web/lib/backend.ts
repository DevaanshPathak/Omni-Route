import { NextResponse } from "next/server";

const defaultApiUrl = "http://localhost:4100";

export function backendUrl(path: string): string {
  const baseUrl = (process.env.INTERNAL_API_URL ?? defaultApiUrl).replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

export function safeProxyError(status = 502, message = "The Omni-Route API could not be reached.") {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message } }, { status });
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
