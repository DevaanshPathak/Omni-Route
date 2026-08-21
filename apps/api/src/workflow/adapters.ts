import {
  CourtDispatchRequestSchema,
  CourtRecordSchema,
  RegistrationRecordSchema,
  RegistrationTransferRequestSchema,
  RevenueMutationRequestSchema,
  RevenueRecordSchema,
  type SemanticAction,
} from "@omni-route/shared";

import type { MockSystemStores } from "../mock-systems/stores.js";

export type DepartmentAdapters = {
  execute(action: SemanticAction): Promise<Record<string, unknown>>;
  verify(action: SemanticAction, response: Record<string, unknown>): boolean;
};

export function createDepartmentAdapters(stores: MockSystemStores): DepartmentAdapters {
  return {
    async execute(action) {
      if (action.recordIdentifier === null)
        throw new Error("Resolved record identifier is required.");
      if (action.system === "court") {
        const payload = CourtDispatchRequestSchema.parse(action.payload);
        const current = stores.court.get(action.recordIdentifier);
        if (current === undefined) throw new Error("Court record disappeared before execution.");
        return CourtRecordSchema.parse(
          stores.court.replace(action.recordIdentifier, { ...current, ...payload }),
        );
      }
      if (action.system === "registration") {
        const payload = RegistrationTransferRequestSchema.parse(action.payload);
        const current = stores.registration.get(action.recordIdentifier);
        if (current === undefined)
          throw new Error("Registration record disappeared before execution.");
        return RegistrationRecordSchema.parse(
          stores.registration.replace(action.recordIdentifier, {
            ...current,
            ...payload,
            court_order_ref: payload.document_no,
          }),
        );
      }
      const payload = RevenueMutationRequestSchema.parse(action.payload);
      const current = stores.revenue.get(action.recordIdentifier);
      if (current === undefined) throw new Error("Revenue record disappeared before execution.");
      return RevenueRecordSchema.parse(
        stores.revenue.replace(action.recordIdentifier, { ...current, ...payload }),
      );
    },

    verify(action, response) {
      if (action.system === "court") {
        const parsed = CourtRecordSchema.safeParse(response);
        return (
          parsed.success &&
          parsed.data.decree_status === "DISPATCHED" &&
          parsed.data.beneficiary === action.payload.beneficiary
        );
      }
      if (action.system === "registration") {
        const parsed = RegistrationRecordSchema.safeParse(response);
        return (
          parsed.success &&
          parsed.data.instrument_type === "COURT_ORDER" &&
          parsed.data.buyer_name === action.payload.buyer_name
        );
      }
      const parsed = RevenueRecordSchema.safeParse(response);
      return (
        parsed.success &&
        parsed.data.mutation_required &&
        parsed.data.owner_nm === action.payload.owner_nm
      );
    },
  };
}
