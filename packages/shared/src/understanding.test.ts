import { describe, expect, it } from "vitest";

import { CanonicalEventProposalSchema, UnderstandingRequestSchema } from "./understanding.js";

const proposal = {
  eventType: "PROPERTY_OWNERSHIP_TRANSFER",
  ownerName: "Raju",
  property: {
    declaredReference: "45",
    surveyNumber: "45/2",
    village: "Sampige",
    district: "Bengaluru Rural",
  },
  legalOrderReference: "ORD-123",
  evidence: {
    ownerName: "Raju",
    propertyReference: "45",
    legalOrderReference: "ORD-123",
  },
} as const;

describe("understanding contracts", () => {
  it("accepts bounded synthetic text and extracted plain-text document input", () => {
    expect(
      UnderstandingRequestSchema.parse({
        synthetic: true,
        provider: "fixture",
        input: { kind: "text", text: "Transfer synthetic property 45 to Raju under ORD-123." },
      }).provider,
    ).toBe("fixture");

    expect(
      UnderstandingRequestSchema.parse({
        synthetic: true,
        input: {
          kind: "document",
          filename: "court-decree.txt",
          contentType: "text/plain",
          text: "Synthetic court decree ORD-123 transfers property 45 to Raju.",
        },
      }).provider,
    ).toBe("auto");
  });

  it("rejects non-synthetic, unsupported, oversized, and target-shaped input", () => {
    expect(() =>
      UnderstandingRequestSchema.parse({
        synthetic: false,
        input: { kind: "text", text: "Transfer property 45 to Raju under ORD-123." },
      }),
    ).toThrow();
    expect(() =>
      UnderstandingRequestSchema.parse({
        synthetic: true,
        input: {
          kind: "document",
          filename: "decree.pdf",
          contentType: "application/pdf",
          text: "A document body long enough to otherwise pass validation.",
        },
      }),
    ).toThrow();
    expect(() =>
      UnderstandingRequestSchema.parse({
        synthetic: true,
        input: { kind: "text", text: "x".repeat(12_001) },
      }),
    ).toThrow();
    expect(() =>
      UnderstandingRequestSchema.parse({
        synthetic: true,
        input: {
          kind: "text",
          text: "Transfer synthetic property 45 to Raju under ORD-123.",
          owner_nm: "Raju",
        },
      }),
    ).toThrow();
  });

  it("strictly validates the model proposal before canonicalization", () => {
    expect(CanonicalEventProposalSchema.parse(proposal)).toEqual(proposal);
    expect(() =>
      CanonicalEventProposalSchema.parse({ ...proposal, property_id: "REG-2391" }),
    ).toThrow();
    expect(() =>
      CanonicalEventProposalSchema.parse({ ...proposal, eventType: "DELETE_PROPERTY" }),
    ).toThrow();
  });
});
