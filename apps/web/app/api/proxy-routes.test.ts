import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as resetDemo } from "./demo/reset/route";
import { GET as getSystems } from "./systems/route";
import { POST as createWorkflow } from "./workflows/route";

describe("web-to-API proxy routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid extraction input before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await createWorkflow(
      new Request("http://localhost:3000/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          synthetic: true,
          provider: "fixture",
          input: { kind: "text", text: "short" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("combines validated read-only records from all three synthetic systems", async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      const data = url.includes("/court/")
        ? {
            order_ref: "ORD-123",
            property_ref: "COURT-PROP-45",
            beneficiary: "Raju",
            decree_status: "ISSUED",
            village_name: "Sampige",
            district_name: "Bengaluru Rural",
          }
        : url.includes("/registration/")
          ? {
              document_no: "SALE-7781",
              property_id: "REG-2391",
              buyer_name: "Anita Rao",
              instrument_type: "SALE",
              locality: "Sampige",
              district_code: "BLR-R",
              court_order_ref: null,
            }
          : {
              survey_no: "45/2",
              owner_nm: "Anita Rao",
              mutation_required: false,
              revenue_village: "Sampige",
              district: "Bengaluru Rural",
              supporting_order_ref: "ORD-123",
            };
      return Promise.resolve(Response.json({ data }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getSystems();
    const body = (await response.json()) as {
      data: { readOnly: boolean; court: { order_ref: string }; revenue: { survey_no: string } };
    };

    expect(response.status).toBe(200);
    expect(body.data.readOnly).toBe(true);
    expect(body.data.court.order_ref).toBe("ORD-123");
    expect(body.data.revenue.survey_no).toBe("45/2");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses the single reset endpoint for canonical and mock state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          status: "reset",
          resources: ["canonical-runtime", "court", "registration", "revenue"],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await resetDemo();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/demo/reset"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
