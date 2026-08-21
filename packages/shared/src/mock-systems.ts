import { z } from "zod";

const identifier = z.string().trim().min(1).max(80);
const personName = z.string().trim().min(1).max(120);
const locationName = z.string().trim().min(1).max(120);

export const SystemNameSchema = z.enum(["court", "registration", "revenue"]);

export const CourtRecordSchema = z
  .object({
    order_ref: identifier,
    property_ref: identifier,
    beneficiary: personName,
    decree_status: z.enum(["ISSUED", "DISPATCHED"]),
    village_name: locationName,
    district_name: locationName,
  })
  .strict();

export const CourtDispatchRequestSchema = CourtRecordSchema.pick({
  property_ref: true,
  beneficiary: true,
  decree_status: true,
}).extend({
  decree_status: z.literal("DISPATCHED"),
});

export const RegistrationRecordSchema = z
  .object({
    document_no: identifier,
    property_id: identifier,
    buyer_name: personName,
    instrument_type: z.enum(["SALE", "COURT_ORDER"]),
    locality: locationName,
    district_code: identifier,
    court_order_ref: identifier.nullable(),
  })
  .strict();

export const RegistrationTransferRequestSchema = RegistrationRecordSchema.pick({
  document_no: true,
  property_id: true,
  buyer_name: true,
  instrument_type: true,
}).extend({
  instrument_type: z.literal("COURT_ORDER"),
});

export const RevenueRecordSchema = z
  .object({
    survey_no: identifier,
    owner_nm: personName,
    mutation_required: z.boolean(),
    revenue_village: locationName,
    district: locationName,
    supporting_order_ref: identifier,
  })
  .strict();

export const RevenueMutationRequestSchema = RevenueRecordSchema.pick({
  survey_no: true,
  owner_nm: true,
  mutation_required: true,
}).extend({
  mutation_required: z.literal(true),
});

export const CourtRecordResponseSchema = z.object({ data: CourtRecordSchema }).strict();
export const RegistrationRecordResponseSchema = z
  .object({ data: RegistrationRecordSchema })
  .strict();
export const RevenueRecordResponseSchema = z.object({ data: RevenueRecordSchema }).strict();

export const SyntheticSystemSnapshotResponseSchema = z
  .object({
    data: z
      .object({
        court: CourtRecordSchema,
        registration: RegistrationRecordSchema,
        revenue: RevenueRecordSchema,
        readOnly: z.literal(true),
      })
      .strict(),
  })
  .strict();

export const ResetResponseSchema = z
  .object({
    data: z
      .object({
        status: z.literal("reset"),
        systems: z.tuple([z.literal("court"), z.literal("registration"), z.literal("revenue")]),
      })
      .strict(),
  })
  .strict();

export const ApiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          "INVALID_REQUEST",
          "NOT_FOUND",
          "INTERNAL_ERROR",
          "MISSING_CONFIGURATION",
          "PROVIDER_FAILURE",
          "PROVIDER_REFUSAL",
          "PROVIDER_TIMEOUT",
          "INVALID_MODEL_OUTPUT",
          "UNSUPPORTED_FIXTURE_INPUT",
        ]),
        message: z.string().min(1),
        issues: z
          .array(
            z
              .object({
                path: z.string(),
                message: z.string(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict(),
  })
  .strict();

export type SystemName = z.infer<typeof SystemNameSchema>;
export type CourtRecord = z.infer<typeof CourtRecordSchema>;
export type CourtDispatchRequest = z.infer<typeof CourtDispatchRequestSchema>;
export type RegistrationRecord = z.infer<typeof RegistrationRecordSchema>;
export type RegistrationTransferRequest = z.infer<typeof RegistrationTransferRequestSchema>;
export type RevenueRecord = z.infer<typeof RevenueRecordSchema>;
export type SyntheticSystemSnapshot = z.infer<typeof SyntheticSystemSnapshotResponseSchema>["data"];
export type RevenueMutationRequest = z.infer<typeof RevenueMutationRequestSchema>;
