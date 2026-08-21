import {
  InteroperabilityGraphSchema,
  SemanticActionGraphSnapshotSchema,
  WorkflowTraceSchema,
  type InteroperabilityGraph,
  type WorkflowTrace,
} from "@omni-route/shared";

import type { CanonicalRuntimeStore } from "../canonical-runtime/runtime-store.js";
import type { MockSystemStores } from "../mock-systems/stores.js";
import { buildSemanticActionGraph } from "./mapper.js";
import type { InteroperabilityRegistry } from "./registry.js";
import { resolvePropertyRecords } from "./resolver.js";

export class PlanningService {
  #graphs = new Map<string, InteroperabilityGraph>();

  constructor(
    private readonly runtime: CanonicalRuntimeStore,
    private readonly stores: MockSystemStores,
    private readonly registry: () => InteroperabilityRegistry,
  ) {}

  plan(workflowId: string): WorkflowTrace | undefined {
    const existing = this.getTrace(workflowId);
    if (existing !== undefined) return existing;
    const view = this.runtime.getWorkflowView(workflowId);
    if (view === undefined) return undefined;
    if (view.workflow.currentState !== "UNDERSTANDING_COMPLETE") {
      throw new Error(
        `Workflow ${workflowId} cannot be planned from ${view.workflow.currentState}.`,
      );
    }

    this.runtime.transitionWorkflow(workflowId, "RESOLVING");
    const registry = this.registry();
    const resolution = resolvePropertyRecords(
      view.event,
      {
        court: this.stores.court.list(),
        registration: this.stores.registration.list(),
        revenue: this.stores.revenue.list(),
      },
      registry.relationships,
      registry.automaticThreshold,
    );
    const graph = buildSemanticActionGraph(workflowId, view.event, resolution, registry);

    if (resolution.status === "MATCHED") {
      this.runtime.transitionWorkflow(workflowId, "MAPPING");
    } else {
      this.runtime.transitionWorkflow(workflowId, "BLOCKED");
      this.runtime.transitionWorkflow(workflowId, "HUMAN_REVIEW_REQUIRED");
    }

    const snapshotState = resolution.status === "MATCHED" ? "PENDING" : "BLOCKED";
    this.runtime.appendGraphSnapshot(
      workflowId,
      SemanticActionGraphSnapshotSchema.parse({
        id: graph.id,
        workflowId,
        revision: 1,
        capturedAt: new Date().toISOString(),
        eventId: view.event.id,
        nodes: [
          {
            id: view.event.id,
            kind: "EVENT",
            label: "Property ownership transfer",
            state: snapshotState,
          },
          ...graph.actions.map((action) => ({
            id: action.id,
            kind: "ACTION" as const,
            label: `${action.system}: ${action.operation}`,
            state: snapshotState,
          })),
        ],
        edges: graph.actions.map((action) => ({
          source: view.event.id,
          target: action.id,
          relation: "routes_to",
        })),
      }),
    );
    this.#graphs.set(workflowId, structuredClone(graph));
    return this.getTrace(workflowId)!;
  }

  getTrace(workflowId: string): WorkflowTrace | undefined {
    const workflow = this.runtime.getWorkflowView(workflowId);
    const graph = this.#graphs.get(workflowId);
    if (workflow === undefined || graph === undefined) return undefined;
    return WorkflowTraceSchema.parse({ workflow, graph: structuredClone(graph) });
  }

  updateGraph(workflowId: string, input: InteroperabilityGraph): WorkflowTrace {
    const graph = InteroperabilityGraphSchema.parse(input);
    if (graph.workflowId !== workflowId || !this.#graphs.has(workflowId)) {
      throw new Error("Workflow graph cannot be updated before planning.");
    }
    this.#graphs.set(workflowId, structuredClone(graph));
    return this.getTrace(workflowId)!;
  }

  reset(): void {
    this.#graphs.clear();
  }
}
