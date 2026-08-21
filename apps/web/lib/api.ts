import { HealthResponseSchema, type HealthResponse } from "@omni-route/shared";

type ApiHealthResult = { ok: true; health: HealthResponse } | { ok: false; message: string };

const defaultApiUrl = "http://localhost:4100";

export async function getApiHealth(): Promise<ApiHealthResult> {
  const apiUrl = (process.env.INTERNAL_API_URL ?? defaultApiUrl).replace(/\/$/, "");

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      return { ok: false, message: "The API health check did not succeed." };
    }

    const parsed = HealthResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return { ok: false, message: "The API returned an unexpected health response." };
    }

    return { ok: true, health: parsed.data };
  } catch {
    return { ok: false, message: "The API could not be reached." };
  }
}
