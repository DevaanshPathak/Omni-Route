import { z } from "zod";

import { CanonicalWorkflowViewSchema, EvidenceRefSchema } from "./canonical.js";
import { SystemNameSchema } from "./mock-systems.js";

const boundedText = z.string().trim().min(1).max(240);

export const ResolutionSignalSchema = z
  .object({
    ruleId: boundedText,
    label: boundedText,
    weight: z.number().min(0).max(1),
    outcome: z.enum(["MATCH", "MISS", "CONFLICT"]),
    expected: boundedText,
    actual: boundedText,
  })
  .strict();

export const EntityMatchSchema = z
  .object({
    system: SystemNameSchema,
    recordIdentifier: boundedText.nullable(),
    score: z.number().min(0).max(1),
    threshold: z.number().min(0).max(1),
    status: z.enum(["MATCH", "NO_MATCH", "AMBIGUOUS", "CONFLICT", "BELOW_THRESHOLD"]),
    signals: z.array(ResolutionSignalSchema),
  })
  .strict();

export const ResolutionResultSchema = z
  .object({
    status: z.enum(["MATCHED", "BLOCKED"]),
    matches: z.array(EntityMatchSchema).length(3),
  })
  .strict();

export const FieldMappingSchema = z
  .object({
    ruleId: boundedText,
    sourcePath: boundedText,
    targetField: boundedText,
    transform: boundedText,
    rationale: boundedText,
    confidence: z.number().min(0).max(1),
    approved: z.boolean(),
    evidence: z.array(EvidenceRefSchema),
  })
  .strict();

export const ActionValidationSchema = z
  .object({
    ruleId: boundedText,
    outcome: z.enum(["PASS", "FAIL"]),
    reason: boundedText,
  })
  .strict();

export const ActionExecutionSchema = z
  .object({
    status: z.enum(["NOT_STARTED", "EXECUTED", "VERIFIED", "FAILED"]),
    requestSummary: boundedText.optional(),
    responseSummary: boundedText.optional(),
  })
  .strict();

export const SemanticActionSchema = z
  .object({
    id: boundedText,
    system: SystemNameSchema,
    operation: boundedText,
    schemaVersion: boundedText,
    recordIdentifier: boundedText.nullable(),
    entityMatch: EntityMatchSchema,
    mappings: z.array(FieldMappingSchema).min(1),
    payload: z.record(z.string(), z.unknown()),
    validation: z.array(ActionValidationSchema),
    execution: ActionExecutionSchema,
  })
  .strict();

export const InteroperabilityGraphSchema = z
  .object({
    id: z.string().regex(/^SAG-[A-Z0-9-]+$/),
    workflowId: z.string().regex(/^WRK-[A-Z0-9]+$/),
    eventId: z.string().regex(/^EVT-[A-Z0-9]+$/),
    route: z.tuple([z.literal("court"), z.literal("registration"), z.literal("revenue")]),
    automaticThreshold: z.number().min(0).max(1),
    status: z.enum([
      "PENDING_VALIDATION",
      "BLOCKED",
      "VALIDATED",
      "EXECUTING",
      "COMPLETED",
      "FAILED",
      "PARTIALLY_COMPLETED",
    ]),
    actions: z.array(SemanticActionSchema).length(3),
  })
  .strict();

export const WorkflowTraceSchema = z
  .object({
    workflow: CanonicalWorkflowViewSchema,
    graph: InteroperabilityGraphSchema,
  })
  .strict();

export const WorkflowTraceResponseSchema = z.object({ data: WorkflowTraceSchema }).strict();

export type ResolutionSignal = z.infer<typeof ResolutionSignalSchema>;
export type EntityMatch = z.infer<typeof EntityMatchSchema>;
export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;
export type ActionValidation = z.infer<typeof ActionValidationSchema>;
export type ActionExecution = z.infer<typeof ActionExecutionSchema>;
export type SemanticAction = z.infer<typeof SemanticActionSchema>;
export type InteroperabilityGraph = z.infer<typeof InteroperabilityGraphSchema>;
export type WorkflowTrace = z.infer<typeof WorkflowTraceSchema>;
