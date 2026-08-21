import { describe, expect, it } from "vitest";

import {
  CourtDispatchRequestSchema,
  RegistrationTransferRequestSchema,
  RevenueMutationRequestSchema,
} from "./mock-systems.js";

describe("synthetic system write contracts", () => {
  it("keeps Court, Registration, and Revenue payloads incompatible", () => {
    const courtPayload = {
      property_ref: "COURT-PROP-45",
      beneficiary: "Raju",
      decree_status: "DISPATCHED",
    };

    expect(CourtDispatchRequestSchema.safeParse(courtPayload).success).toBe(true);
    expect(RegistrationTransferRequestSchema.safeParse(courtPayload).success).toBe(false);
    expect(RevenueMutationRequestSchema.safeParse(courtPayload).success).toBe(false);
  });

  it("requires the safe operation literal for each update", () => {
    expect(
      RegistrationTransferRequestSchema.safeParse({
        document_no: "ORD-123",
        property_id: "REG-2391",
        buyer_name: "Raju",
        instrument_type: "SALE",
      }).success,
    ).toBe(false);

    expect(
      RevenueMutationRequestSchema.safeParse({
        survey_no: "45/2",
        owner_nm: "Raju",
        mutation_required: false,
      }).success,
    ).toBe(false);
  });
});
