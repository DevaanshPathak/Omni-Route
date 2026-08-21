import { z } from "zod";

const boundedInputText = z.string().trim().min(20).max(12_000);
const extractedValue = z.string().trim().min(1).max(240);

export const UnderstandingProviderSelectionSchema = z.enum(["auto", "openai", "fixture"]);

export const UnderstandingInputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("text"),
      text: boundedInputText,
    })
    .strict(),
  z
    .object({
      kind: z.literal("document"),
      filename: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .regex(/\.txt$/i),
      contentType: z.literal("text/plain"),
      text: boundedInputText,
    })
    .strict(),
]);

export const UnderstandingRequestSchema = z
  .object({
    synthetic: z.literal(true),
    provider: UnderstandingProviderSelectionSchema.default("auto"),
    input: UnderstandingInputSchema,
  })
  .strict();

export const CanonicalEventProposalSchema = z
  .object({
    eventType: z.literal("PROPERTY_OWNERSHIP_TRANSFER"),
    ownerName: extractedValue,
    property: z
      .object({
        declaredReference: extractedValue,
        surveyNumber: extractedValue.nullable(),
        village: extractedValue.nullable(),
        district: extractedValue.nullable(),
      })
      .strict(),
    legalOrderReference: extractedValue,
    evidence: z
      .object({
        ownerName: extractedValue,
        propertyReference: extractedValue,
        legalOrderReference: extractedValue,
      })
      .strict(),
  })
  .strict();

export const UnderstandingErrorCodeSchema = z.enum([
  "MISSING_CONFIGURATION",
  "PROVIDER_FAILURE",
  "PROVIDER_REFUSAL",
  "PROVIDER_TIMEOUT",
  "INVALID_MODEL_OUTPUT",
  "UNSUPPORTED_FIXTURE_INPUT",
]);

export type UnderstandingProviderSelection = z.infer<typeof UnderstandingProviderSelectionSchema>;
export type UnderstandingInput = z.infer<typeof UnderstandingInputSchema>;
export type UnderstandingRequest = z.infer<typeof UnderstandingRequestSchema>;
export type CanonicalEventProposal = z.infer<typeof CanonicalEventProposalSchema>;
export type UnderstandingErrorCode = z.infer<typeof UnderstandingErrorCodeSchema>;
