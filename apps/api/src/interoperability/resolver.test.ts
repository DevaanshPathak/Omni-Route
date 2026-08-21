import { describe, expect, it } from "vitest";

import type {
  CanonicalEvent,
  CourtRecord,
  RegistrationRecord,
  RevenueRecord,
} from "@omni-route/shared";

import { resolvePropertyRecords, type PropertyRelationship } from "./resolver.js";

const event: CanonicalEvent = {
  id: "EVT-TEST",
  type: "PROPERTY_OWNERSHIP_TRANSFER",
  effectiveOwner: { id: "PER-TEST", name: "Raju" },
  property: {
    id: "PRO-TEST",
    declaredReference: "45",
    surveyNumber: "45/2",
    village: "Sampige",
    district: "Bengaluru Rural",
  },
  legalOrder: {
    id: "DOC-TEST",
    type: "COURT_DECREE",
    reference: "ORD-123",
    source: "synthetic_text",
    evidence: [{ source: "DOC-TEST", field: "legal_order.reference", value: "ORD-123" }],
  },
  interpretation: { provider: "fixture", model: "fixture-v1", promptVersion: "v1" },
  evidence: [{ source: "DOC-TEST", field: "property.survey_number", value: "45/2" }],
};

const relationship: PropertyRelationship = {
  canonicalPropertyReference: "45",
  surveyNumber: "45/2",
  legalOrderReference: "ORD-123",
  courtOrderReference: "ORD-123",
  registrationPropertyId: "REG-2391",
  registrationDistrictCode: "BLR-R",
  revenueSurveyNumber: "45/2",
};

const records: {
  court: CourtRecord[];
  registration: RegistrationRecord[];
  revenue: RevenueRecord[];
} = {
  court: [
    {
      order_ref: "ORD-123",
      property_ref: "COURT-PROP-45",
      beneficiary: "Raju",
      decree_status: "ISSUED",
      village_name: "Sampige",
      district_name: "Bengaluru Rural",
    },
  ],
  registration: [
    {
      document_no: "SALE-7781",
      property_id: "REG-2391",
      buyer_name: "Anita Rao",
      instrument_type: "SALE",
      locality: "Sampige",
      district_code: "BLR-R",
      court_order_ref: null,
    },
  ],
  revenue: [
    {
      survey_no: "45/2",
      owner_nm: "Anita Rao",
      mutation_required: false,
      revenue_village: "Sampige",
      district: "Bengaluru Rural",
      supporting_order_ref: "ORD-123",
    },
  ],
};

describe("deterministic property resolver", () => {
  it("resolves all intended records with stable score components", () => {
    const result = resolvePropertyRecords(event, records, [relationship], 0.9);

    expect(result.status).toBe("MATCHED");
    expect(
      result.matches.map((match) => [match.system, match.recordIdentifier, match.score]),
    ).toEqual([
      ["court", "ORD-123", 1],
      ["registration", "REG-2391", 1],
      ["revenue", "45/2", 1],
    ]);
    expect(result.matches[0]?.signals.map((signal) => signal.weight)).toEqual([
      0.35, 0.3, 0.2, 0.15,
    ]);
  });

  it("fails closed when the required survey identifier conflicts", () => {
    const conflicting = structuredClone(records);
    conflicting.revenue[0]!.survey_no = "45/3";
    const result = resolvePropertyRecords(event, conflicting, [relationship], 0.9);

    expect(result.status).toBe("BLOCKED");
    expect(result.matches.find((match) => match.system === "revenue")?.status).toBe("CONFLICT");
  });

  it("blocks missing and ambiguous candidates", () => {
    const missing = resolvePropertyRecords(event, { ...records, revenue: [] }, [relationship], 0.9);
    const ambiguous = resolvePropertyRecords(
      event,
      { ...records, court: [...records.court, { ...records.court[0]! }] },
      [relationship],
      0.9,
    );

    expect(missing.status).toBe("BLOCKED");
    expect(missing.matches.find((match) => match.system === "revenue")?.status).toBe("NO_MATCH");
    expect(ambiguous.status).toBe("BLOCKED");
    expect(ambiguous.matches.find((match) => match.system === "court")?.status).toBe("AMBIGUOUS");
  });
});
