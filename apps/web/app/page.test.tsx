import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

describe("home page API status", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the connected API when the health contract is valid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            service: "omni-route-api",
            status: "ok",
            version: "0.1.0",
            timestamp: "2026-08-21T04:00:00.000Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("API connected");
    expect(html).toContain("omni-route-api");
    expect(html).toContain("Test the understanding pipeline");
    expect(html).toContain("Synthetic court decree");
    expect(html).toContain("Deterministic fixture");
    expect(html).toContain("Inspect seeded system records");
    expect(html).toContain("Understanding only");
    expect(html).toContain("No departmental record is changed");
  });

  it("shows a safe unavailable state when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("API unavailable");
    expect(html).toContain("Test the understanding pipeline");
  });
});
