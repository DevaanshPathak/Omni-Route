import { z } from "zod";

const canonicalId = (prefix: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^${prefix}-[A-Z0-9]+$`), `Expected a ${prefix} identifier.`);
const nonEmptyText = z.string().trim().min(1).max(240);

export const EvidenceRefSchema = z
  .object({
    source: nonEmptyText,
    field: nonEmptyText,
    value: nonEmptyText,
  })
  .strict();

export const CanonicalPersonSchema = z
  .object({
    id: canonicalId("PER"),
    name: z.string().trim().min(1).max(120),
  })
  .strict();

export const CanonicalPropertySchema = z
  .object({
    id: canonicalId("PRO"),
    declaredReference: nonEmptyText.optional(),
    surveyNumber: nonEmptyText.optional(),
    village: nonEmptyText.optional(),
    district: nonEmptyText.optional(),
  })
  .strict()
  .refine(
    ({ declaredReference, surveyNumber }) =>
      declaredReference !== undefined || surveyNumber !== undefined,
    { message: "A canonical property requires a declared reference or survey number." },
  );

export const CanonicalDocumentSchema = z
  .object({
    id: canonicalId("DOC"),
    type: z.literal("COURT_DECREE"),
    reference: nonEmptyText,
    source: z.enum(["synthetic_text", "synthetic_upload"]),
    evidence: z.array(EvidenceRefSchema).min(1),
  })
  .strict();

export const CanonicalEventSchema = z
  .object({
    id: canonicalId("EVT"),
    type: z.literal("PROPERTY_OWNERSHIP_TRANSFER"),
    effectiveOwner: CanonicalPersonSchema,
    property: CanonicalPropertySchema,
    legalOrder: CanonicalDocumentSchema,
    evidence: z.array(EvidenceRefSchema).min(1),
  })
  .strict();

export const WorkflowStateSchema = z.enum([
  "RECEIVED",
  "EXTRACTING",
  "UNDERSTANDING_COMPLETE",
  "RESOLVING",
  "MAPPING",
  "VALIDATING",
  "BLOCKED",
  "HUMAN_REVIEW_REQUIRED",
  "EXECUTING",
  "VERIFYING",
  "COMPLETED",
  "FAILED",
  "PARTIALLY_COMPLETED",
]);

export const WorkflowTransitionSchema = z
  .object({
    sequence: z.number().int().positive(),
    from: WorkflowStateSchema.nullable(),
    to: WorkflowStateSchema,
    at: z.iso.datetime(),
  })
  .strict();

export const WorkflowSchema = z
  .object({
    id: canonicalId("WRK"),
    canonicalEventId: canonicalId("EVT"),
    currentState: WorkflowStateSchema,
    revision: z.number().int().nonnegative(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    transitions: z.array(WorkflowTransitionSchema).min(1),
  })
  .strict();

export const ValidationResultSchema = z
  .object({
    id: canonicalId("VAL"),
    workflowId: canonicalId("WRK"),
    ruleId: nonEmptyText,
    outcome: z.enum(["PASS", "FAIL"]),
    reason: nonEmptyText,
    evidence: z.array(EvidenceRefSchema),
    checkedAt: z.iso.datetime(),
  })
  .strict();

export const SemanticGraphNodeSchema = z
  .object({
    id: nonEmptyText,
    kind: z.enum(["EVENT", "ENTITY", "ACTION"]),
    label: nonEmptyText,
    state: z.enum(["PENDING", "PASSED", "BLOCKED", "EXECUTED"]),
  })
  .strict();

export const SemanticGraphEdgeSchema = z
  .object({
    source: nonEmptyText,
    target: nonEmptyText,
    relation: nonEmptyText,
  })
  .strict();

export const SemanticActionGraphSnapshotSchema = z
  .object({
    id: canonicalId("SAG"),
    workflowId: canonicalId("WRK"),
    revision: z.number().int().positive(),
    capturedAt: z.iso.datetime(),
    eventId: canonicalId("EVT"),
    nodes: z.array(SemanticGraphNodeSchema).min(1),
    edges: z.array(SemanticGraphEdgeSchema),
  })
  .strict();

export const AuditEventSchema = z
  .object({
    id: canonicalId("AUD"),
    workflowId: canonicalId("WRK"),
    sequence: z.number().int().positive(),
    timestamp: z.iso.datetime(),
    type: z.enum([
      "WORKFLOW_CREATED",
      "STATE_TRANSITIONED",
      "GRAPH_SNAPSHOT_STORED",
      "VALIDATION_RECORDED",
    ]),
    component: nonEmptyText,
    summary: nonEmptyText,
    state: WorkflowStateSchema.optional(),
    evidence: z.array(EvidenceRefSchema),
  })
  .strict();

export const CanonicalWorkflowViewSchema = z
  .object({
    workflow: WorkflowSchema,
    event: CanonicalEventSchema,
    graphSnapshots: z.array(SemanticActionGraphSnapshotSchema),
    validationResults: z.array(ValidationResultSchema),
    auditEvents: z.array(AuditEventSchema),
  })
  .strict();

export const CanonicalWorkflowResponseSchema = z
  .object({ data: CanonicalWorkflowViewSchema })
  .strict();

export const DemoResetResponseSchema = z
  .object({
    data: z
      .object({
        status: z.literal("reset"),
        resources: z.tuple([
          z.literal("canonical-runtime"),
          z.literal("court"),
          z.literal("registration"),
          z.literal("revenue"),
        ]),
      })
      .strict(),
  })
  .strict();

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type CanonicalPerson = z.infer<typeof CanonicalPersonSchema>;
export type CanonicalProperty = z.infer<typeof CanonicalPropertySchema>;
export type CanonicalDocument = z.infer<typeof CanonicalDocumentSchema>;
export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type SemanticActionGraphSnapshot = z.infer<typeof SemanticActionGraphSnapshotSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type CanonicalWorkflowView = z.infer<typeof CanonicalWorkflowViewSchema>;
