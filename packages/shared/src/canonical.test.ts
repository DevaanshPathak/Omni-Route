import { describe, expect, it } from "vitest";

import { CanonicalEventSchema, CanonicalPersonSchema, type CanonicalEvent } from "./canonical.js";

const canonicalEvent: CanonicalEvent = {
  id: "EVT-0001",
  type: "PROPERTY_OWNERSHIP_TRANSFER",
  effectiveOwner: { id: "PER-0001", name: "Raju" },
  property: {
    id: "PRO-0001",
    declaredReference: "45",
    surveyNumber: "45/2",
    village: "Sampige",
    district: "Bengaluru Rural",
  },
  legalOrder: {
    id: "DOC-0001",
    type: "COURT_DECREE",
    reference: "ORD-123",
    source: "synthetic_text",
    evidence: [{ source: "DOC-0001", field: "legal_order.reference", value: "ORD-123" }],
  },
  evidence: [{ source: "DOC-0001", field: "effective_owner.name", value: "Raju" }],
};

describe("canonical runtime contracts", () => {
  it("parses a department-independent property-transfer event", () => {
    expect(CanonicalEventSchema.parse(canonicalEvent)).toEqual(canonicalEvent);
  });

  it("rejects target-system-shaped data at the canonical boundary", () => {
    expect(() =>
      CanonicalPersonSchema.parse({ id: "PER-0001", name: "Raju", beneficiary: "Raju" }),
    ).toThrow();
    expect(() =>
      CanonicalEventSchema.parse({ property_id: "REG-2391", buyer_name: "Raju" }),
    ).toThrow();
  });

  it("rejects incomplete evidence and non-synthetic documents", () => {
    expect(() =>
      CanonicalEventSchema.parse({
        ...canonicalEvent,
        legalOrder: { ...canonicalEvent.legalOrder, source: "live_upload" },
      }),
    ).toThrow();
    expect(() =>
      CanonicalEventSchema.parse({
        ...canonicalEvent,
        evidence: [{ source: "DOC-0001", field: "effective_owner.name", value: "" }],
      }),
    ).toThrow();
  });
});
