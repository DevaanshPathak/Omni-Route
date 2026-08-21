import {
  InteroperabilityGraphSchema,
  ValidationResultSchema,
  type InteroperabilityGraph,
  type SemanticAction,
  type WorkflowTrace,
} from "@omni-route/shared";

import type { CanonicalRuntimeStore } from "../canonical-runtime/runtime-store.js";
import type { PlanningService } from "../interoperability/planning-service.js";
import type { InteroperabilityRegistry } from "../interoperability/registry.js";
import type { DepartmentAdapters } from "./adapters.js";
import type { DeterministicValidator } from "./validation.js";

function sequenceId(prefix: string, sequence: number): string {
  return `${prefix}-${sequence.toString().padStart(6, "0")}`;
}

function replaceAction(
  graph: InteroperabilityGraph,
  actionId: string,
  update: (action: SemanticAction) => SemanticAction,
): InteroperabilityGraph {
  return InteroperabilityGraphSchema.parse({
    ...graph,
    actions: graph.actions.map((action) => (action.id === actionId ? update(action) : action)),
  });
}

export class WorkflowOrchestrator {
  #validationSequence = 0;

  constructor(
    private readonly runtime: CanonicalRuntimeStore,
    private readonly planning: PlanningService,
    private readonly registry: InteroperabilityRegistry,
    private readonly validator: DeterministicValidator,
    private readonly adapters: DepartmentAdapters,
  ) {}

  async execute(workflowId: string): Promise<WorkflowTrace | undefined> {
    const trace = this.planning.getTrace(workflowId) ?? this.planning.plan(workflowId);
    if (trace === undefined) return undefined;
    if (trace.graph.status === "BLOCKED") return trace;
    if (trace.workflow.workflow.currentState !== "MAPPING") {
      return trace;
    }

    this.runtime.transitionWorkflow(workflowId, "VALIDATING");
    const validation = this.validator.validate(trace.graph, trace.workflow.event, this.registry);
    for (const action of validation.graph.actions) {
      for (const rule of action.validation) {
        this.runtime.appendValidationResult(
          workflowId,
          ValidationResultSchema.parse({
            id: sequenceId("VAL", ++this.#validationSequence),
            workflowId,
            ruleId: `${action.system}.${rule.ruleId}`,
            outcome: rule.outcome,
            reason: rule.reason,
            evidence: action.mappings.flatMap((mapping) => mapping.evidence).slice(0, 3),
            checkedAt: new Date().toISOString(),
          }),
        );
      }
    }
    this.planning.updateGraph(workflowId, validation.graph);

    if (!validation.passed) {
      this.runtime.transitionWorkflow(workflowId, "BLOCKED");
      this.runtime.transitionWorkflow(workflowId, "HUMAN_REVIEW_REQUIRED");
      this.runtime.appendAuditEvent(workflowId, {
        type: "WORKFLOW_FINISHED",
        component: "execution-gate",
        summary: "Aggregate preflight failed; no adapters were called.",
        state: "HUMAN_REVIEW_REQUIRED",
        evidence: [],
      });
      return this.planning.getTrace(workflowId)!;
    }

    this.runtime.transitionWorkflow(workflowId, "EXECUTING");
    let graph = InteroperabilityGraphSchema.parse({ ...validation.graph, status: "EXECUTING" });
    this.planning.updateGraph(workflowId, graph);
    let executedCount = 0;

    for (const action of graph.actions) {
      try {
        const response = await this.adapters.execute(action);
        executedCount += 1;
        graph = replaceAction(graph, action.id, (current) => ({
          ...current,
          execution: {
            status: "EXECUTED",
            requestSummary: `${current.system}.${current.operation} accepted a validated synthetic payload.`,
            responseSummary: `${current.system} returned an updated synthetic record.`,
            response,
          },
        }));
        this.planning.updateGraph(workflowId, graph);
        this.runtime.appendAuditEvent(workflowId, {
          type: "ACTION_EXECUTED",
          component: `${action.system}-adapter`,
          summary: `${action.system}.${action.operation} executed against the synthetic store.`,
          state: "EXECUTING",
          evidence: action.mappings.flatMap((mapping) => mapping.evidence).slice(0, 2),
        });
      } catch {
        graph = replaceAction(graph, action.id, (current) => ({
          ...current,
          execution: {
            status: "FAILED",
            requestSummary: `${current.system}.${current.operation} received a validated synthetic payload.`,
            responseSummary:
              "The synthetic adapter failed before a verifiable response was returned.",
          },
        }));
        graph = InteroperabilityGraphSchema.parse({
          ...graph,
          status: executedCount === 0 ? "FAILED" : "PARTIALLY_COMPLETED",
        });
        this.planning.updateGraph(workflowId, graph);
        const terminalState = executedCount === 0 ? "FAILED" : "PARTIALLY_COMPLETED";
        this.runtime.transitionWorkflow(workflowId, terminalState);
        this.runtime.appendAuditEvent(workflowId, {
          type: "WORKFLOW_FINISHED",
          component: "workflow-orchestrator",
          summary: `Execution stopped after ${executedCount} successful synthetic action(s).`,
          state: terminalState,
          evidence: [],
        });
        return this.planning.getTrace(workflowId)!;
      }
    }

    this.runtime.transitionWorkflow(workflowId, "VERIFYING");
    let verificationFailed = false;
    for (const action of graph.actions) {
      const response = action.execution.response;
      const verified = response !== undefined && this.adapters.verify(action, response);
      verificationFailed ||= !verified;
      graph = replaceAction(graph, action.id, (current) => ({
        ...current,
        execution: {
          ...current.execution,
          status: verified ? "VERIFIED" : "FAILED",
          responseSummary: verified
            ? `${current.system} response passed deterministic verification.`
            : `${current.system} response failed deterministic verification.`,
        },
      }));
      this.runtime.appendAuditEvent(workflowId, {
        type: "ACTION_VERIFIED",
        component: "response-verifier",
        summary: `${action.system}.${action.operation} verification ${verified ? "passed" : "failed"}.`,
        state: "VERIFYING",
        evidence: [],
      });
    }

    const finalState = verificationFailed ? "FAILED" : "COMPLETED";
    graph = InteroperabilityGraphSchema.parse({ ...graph, status: finalState });
    this.planning.updateGraph(workflowId, graph);
    this.runtime.transitionWorkflow(workflowId, finalState);
    this.runtime.appendAuditEvent(workflowId, {
      type: "WORKFLOW_FINISHED",
      component: "workflow-orchestrator",
      summary: verificationFailed
        ? "One or more synthetic responses failed verification."
        : "All synthetic actions executed and verified.",
      state: finalState,
      evidence: [],
    });
    return this.planning.getTrace(workflowId)!;
  }

  reset(): void {
    this.#validationSequence = 0;
  }
}
