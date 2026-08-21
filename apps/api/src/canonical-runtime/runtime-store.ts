import {
  AuditEventSchema,
  CanonicalEventSchema,
  SemanticActionGraphSnapshotSchema,
  ValidationResultSchema,
  WorkflowSchema,
  WorkflowStateSchema,
  type AuditEvent,
  type CanonicalDocument,
  type CanonicalEvent,
  type CanonicalPerson,
  type CanonicalProperty,
  type CanonicalWorkflowView,
  type SemanticActionGraphSnapshot,
  type ValidationResult,
  type Workflow,
  type WorkflowState,
} from "@omni-route/shared";

const allowedTransitions: Readonly<Record<WorkflowState, readonly WorkflowState[]>> = {
  RECEIVED: ["EXTRACTING"],
  EXTRACTING: ["UNDERSTANDING_COMPLETE", "FAILED"],
  UNDERSTANDING_COMPLETE: ["RESOLVING"],
  RESOLVING: ["MAPPING", "BLOCKED", "HUMAN_REVIEW_REQUIRED", "FAILED"],
  MAPPING: ["VALIDATING", "BLOCKED", "HUMAN_REVIEW_REQUIRED", "FAILED"],
  VALIDATING: ["BLOCKED", "HUMAN_REVIEW_REQUIRED", "EXECUTING", "FAILED"],
  BLOCKED: ["HUMAN_REVIEW_REQUIRED"],
  HUMAN_REVIEW_REQUIRED: [],
  EXECUTING: ["VERIFYING", "FAILED", "PARTIALLY_COMPLETED"],
  VERIFYING: ["COMPLETED", "FAILED", "PARTIALLY_COMPLETED"],
  COMPLETED: [],
  FAILED: [],
  PARTIALLY_COMPLETED: [],
};

type Clock = () => Date;

function sequenceId(prefix: string, sequence: number): string {
  return `${prefix}-${sequence.toString().padStart(6, "0")}`;
}

export class CanonicalRuntimeStore {
  readonly #clock: Clock;
  #workflowSequence = 0;
  #auditSequence = 0;
  #people = new Map<string, CanonicalPerson>();
  #properties = new Map<string, CanonicalProperty>();
  #documents = new Map<string, CanonicalDocument>();
  #events = new Map<string, CanonicalEvent>();
  #workflows = new Map<string, Workflow>();
  #graphSnapshots = new Map<string, SemanticActionGraphSnapshot[]>();
  #validationResults = new Map<string, ValidationResult[]>();
  #auditEvents = new Map<string, AuditEvent[]>();

  constructor(clock: Clock = () => new Date()) {
    this.#clock = clock;
  }

  createWorkflow(input: CanonicalEvent): CanonicalWorkflowView {
    const event = CanonicalEventSchema.parse(input);
    const now = this.#clock().toISOString();
    const workflowId = sequenceId("WRK", ++this.#workflowSequence);
    const workflow = WorkflowSchema.parse({
      id: workflowId,
      canonicalEventId: event.id,
      currentState: "RECEIVED",
      revision: 0,
      createdAt: now,
      updatedAt: now,
      transitions: [{ sequence: 1, from: null, to: "RECEIVED", at: now }],
    });

    this.#people.set(event.effectiveOwner.id, structuredClone(event.effectiveOwner));
    this.#properties.set(event.property.id, structuredClone(event.property));
    this.#documents.set(event.legalOrder.id, structuredClone(event.legalOrder));
    this.#events.set(event.id, structuredClone(event));
    this.#workflows.set(workflowId, workflow);
    this.#graphSnapshots.set(workflowId, []);
    this.#validationResults.set(workflowId, []);
    this.#auditEvents.set(workflowId, []);
    this.#appendAudit(workflowId, {
      type: "WORKFLOW_CREATED",
      component: "canonical-runtime",
      summary: "Canonical workflow created.",
      state: "RECEIVED",
      evidence: event.evidence,
    });

    return this.#requireWorkflowView(workflowId);
  }

  transitionWorkflow(workflowId: string, requestedState: WorkflowState): Workflow {
    const nextState = WorkflowStateSchema.parse(requestedState);
    const current = this.#requireWorkflow(workflowId);
    if (!allowedTransitions[current.currentState].includes(nextState)) {
      throw new Error(`Invalid workflow transition: ${current.currentState} -> ${nextState}`);
    }

    const now = this.#clock().toISOString();
    const next = WorkflowSchema.parse({
      ...current,
      currentState: nextState,
      revision: current.revision + 1,
      updatedAt: now,
      transitions: [
        ...current.transitions,
        {
          sequence: current.transitions.length + 1,
          from: current.currentState,
          to: nextState,
          at: now,
        },
      ],
    });
    this.#workflows.set(workflowId, next);
    this.#appendAudit(workflowId, {
      type: "STATE_TRANSITIONED",
      component: "workflow-state",
      summary: `Workflow transitioned from ${current.currentState} to ${nextState}.`,
      state: nextState,
      evidence: [],
    });
    return structuredClone(next);
  }

  appendGraphSnapshot(
    workflowId: string,
    input: SemanticActionGraphSnapshot,
  ): SemanticActionGraphSnapshot {
    this.#requireWorkflow(workflowId);
    const snapshot = SemanticActionGraphSnapshotSchema.parse(input);
    if (snapshot.workflowId !== workflowId) {
      throw new Error("Graph snapshot workflow ID does not match the repository key.");
    }
    const snapshots = this.#graphSnapshots.get(workflowId)!;
    if (snapshot.revision !== snapshots.length + 1) {
      throw new Error("Graph snapshot revisions must be appended in order.");
    }
    snapshots.push(structuredClone(snapshot));
    this.#appendAudit(workflowId, {
      type: "GRAPH_SNAPSHOT_STORED",
      component: "semantic-action-graph",
      summary: `Semantic Action Graph revision ${snapshot.revision} stored.`,
      evidence: [],
    });
    return structuredClone(snapshot);
  }

  appendValidationResult(workflowId: string, input: ValidationResult): ValidationResult {
    this.#requireWorkflow(workflowId);
    const result = ValidationResultSchema.parse(input);
    if (result.workflowId !== workflowId) {
      throw new Error("Validation result workflow ID does not match the repository key.");
    }
    this.#validationResults.get(workflowId)!.push(structuredClone(result));
    this.#appendAudit(workflowId, {
      type: "VALIDATION_RECORDED",
      component: "validation-store",
      summary: `Validation rule ${result.ruleId} recorded as ${result.outcome}.`,
      evidence: result.evidence,
    });
    return structuredClone(result);
  }

  appendAuditEvent(
    workflowId: string,
    input: Omit<AuditEvent, "id" | "workflowId" | "sequence" | "timestamp">,
  ): void {
    this.#requireWorkflow(workflowId);
    this.#appendAudit(workflowId, input);
  }

  getWorkflowView(workflowId: string): CanonicalWorkflowView | undefined {
    if (!this.#workflows.has(workflowId)) return undefined;
    return this.#requireWorkflowView(workflowId);
  }

  getPerson(personId: string): CanonicalPerson | undefined {
    return this.#clonedValue(this.#people, personId);
  }

  getProperty(propertyId: string): CanonicalProperty | undefined {
    return this.#clonedValue(this.#properties, propertyId);
  }

  getDocument(documentId: string): CanonicalDocument | undefined {
    return this.#clonedValue(this.#documents, documentId);
  }

  getEvent(eventId: string): CanonicalEvent | undefined {
    return this.#clonedValue(this.#events, eventId);
  }

  reset(): void {
    this.#workflowSequence = 0;
    this.#auditSequence = 0;
    this.#people.clear();
    this.#properties.clear();
    this.#documents.clear();
    this.#events.clear();
    this.#workflows.clear();
    this.#graphSnapshots.clear();
    this.#validationResults.clear();
    this.#auditEvents.clear();
  }

  #clonedValue<TValue>(values: ReadonlyMap<string, TValue>, id: string): TValue | undefined {
    const value = values.get(id);
    return value === undefined ? undefined : structuredClone(value);
  }

  #requireWorkflow(workflowId: string): Workflow {
    const workflow = this.#workflows.get(workflowId);
    if (workflow === undefined) throw new Error(`Unknown workflow: ${workflowId}`);
    return workflow;
  }

  #requireWorkflowView(workflowId: string): CanonicalWorkflowView {
    const workflow = this.#requireWorkflow(workflowId);
    const event = this.#events.get(workflow.canonicalEventId);
    if (event === undefined)
      throw new Error(`Missing canonical event: ${workflow.canonicalEventId}`);
    return structuredClone({
      workflow,
      event,
      graphSnapshots: this.#graphSnapshots.get(workflowId) ?? [],
      validationResults: this.#validationResults.get(workflowId) ?? [],
      auditEvents: this.#auditEvents.get(workflowId) ?? [],
    });
  }

  #appendAudit(
    workflowId: string,
    input: Omit<AuditEvent, "id" | "workflowId" | "sequence" | "timestamp">,
  ): void {
    const events = this.#auditEvents.get(workflowId);
    if (events === undefined) throw new Error(`Unknown workflow: ${workflowId}`);
    const auditEvent = AuditEventSchema.parse({
      ...input,
      id: sequenceId("AUD", ++this.#auditSequence),
      workflowId,
      sequence: events.length + 1,
      timestamp: this.#clock().toISOString(),
    });
    events.push(auditEvent);
  }
}
