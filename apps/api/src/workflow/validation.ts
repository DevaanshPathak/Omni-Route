import { Ajv2020 } from "ajv/dist/2020.js";

import {
  CanonicalEventSchema,
  InteroperabilityGraphSchema,
  type ActionValidation,
  type CanonicalEvent,
  type InteroperabilityGraph,
} from "@omni-route/shared";

import type { InteroperabilityRegistry } from "../interoperability/registry.js";

export type ValidationOutcome = {
  passed: boolean;
  graph: InteroperabilityGraph;
};

export class DeterministicValidator {
  readonly #ajv = new Ajv2020({ allErrors: true, strict: true });

  validate(
    inputGraph: InteroperabilityGraph,
    event: CanonicalEvent,
    registry: InteroperabilityRegistry,
  ): ValidationOutcome {
    const graph = structuredClone(inputGraph);
    const canonicalValid = CanonicalEventSchema.safeParse(event).success;

    graph.actions = graph.actions.map((action) => {
      const config = registry.actions.find((candidate) => candidate.system === action.system);
      const requiredFields = Array.isArray(config?.jsonSchema.required)
        ? config.jsonSchema.required.filter((field): field is string => typeof field === "string")
        : [];
      const mappedFields = new Set(
        action.mappings.filter((mapping) => mapping.approved).map((mapping) => mapping.targetField),
      );
      const schemaValidate =
        config === undefined ? undefined : this.#ajv.compile(config.jsonSchema);
      const schemaValid = schemaValidate?.(action.payload) ?? false;
      const eligible = action.entityMatch.signals.some(
        (signal) => signal.ruleId === "RES-ELIGIBILITY" && signal.outcome === "MATCH",
      );
      const rules: ActionValidation[] = [
        {
          ruleId: "GATE-CANONICAL",
          outcome: canonicalValid ? "PASS" : "FAIL",
          reason: canonicalValid
            ? "Canonical event conforms to the runtime schema."
            : "Canonical event is invalid.",
        },
        {
          ruleId: "GATE-ENTITY",
          outcome:
            action.entityMatch.status === "MATCH" && action.recordIdentifier !== null
              ? "PASS"
              : "FAIL",
          reason:
            action.entityMatch.status === "MATCH"
              ? "Required target record was deterministically resolved."
              : `Entity resolution ended as ${action.entityMatch.status}.`,
        },
        {
          ruleId: "GATE-MAPPING",
          outcome:
            config !== undefined &&
            requiredFields.every((field) => mappedFields.has(field)) &&
            action.mappings.every((mapping) => mapping.approved)
              ? "PASS"
              : "FAIL",
          reason:
            config !== undefined && requiredFields.every((field) => mappedFields.has(field))
              ? "Every required field has an approved mapping."
              : "A required approved mapping is missing.",
        },
        {
          ruleId: "GATE-CONFIDENCE",
          outcome:
            action.entityMatch.score >= graph.automaticThreshold &&
            !action.entityMatch.signals.some((signal) => signal.outcome === "CONFLICT")
              ? "PASS"
              : "FAIL",
          reason: `Entity score ${action.entityMatch.score.toFixed(2)}; required ${graph.automaticThreshold.toFixed(2)}.`,
        },
        {
          ruleId: "GATE-JSON-SCHEMA",
          outcome: schemaValid ? "PASS" : "FAIL",
          reason: schemaValid
            ? `Payload conforms to ${action.schemaVersion}.`
            : "Payload does not conform to the active target JSON Schema.",
        },
        {
          ruleId: "GATE-BUSINESS-RULE",
          outcome: eligible ? "PASS" : "FAIL",
          reason: eligible
            ? "Target record is eligible for the supported transfer."
            : "Target record is not in an eligible state.",
        },
        {
          ruleId: "GATE-EXECUTION-POLICY",
          outcome:
            event.type === "PROPERTY_OWNERSHIP_TRANSFER" &&
            action.execution.status === "NOT_STARTED"
              ? "PASS"
              : "FAIL",
          reason:
            event.type === "PROPERTY_OWNERSHIP_TRANSFER"
              ? "Action is unexecuted and permitted for the supported event."
              : "Event is outside execution policy.",
        },
      ];
      return { ...action, validation: rules };
    });

    const passed = graph.actions.every((action) =>
      action.validation.every((rule) => rule.outcome === "PASS"),
    );
    graph.status = passed ? "VALIDATED" : "BLOCKED";
    return { passed, graph: InteroperabilityGraphSchema.parse(graph) };
  }
}
