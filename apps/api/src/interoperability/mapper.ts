import {
  InteroperabilityGraphSchema,
  type CanonicalEvent,
  type EvidenceRef,
  type InteroperabilityGraph,
  type ResolutionResult,
} from "@omni-route/shared";

import type { InteroperabilityRegistry, MappingRule, PropertyRelationship } from "./registry.js";

function sourceValue(event: CanonicalEvent, path: string): unknown {
  const values: Record<string, unknown> = {
    type: event.type,
    "effectiveOwner.name": event.effectiveOwner.name,
    "property.declaredReference": event.property.declaredReference,
    "property.surveyNumber": event.property.surveyNumber,
    "legalOrder.reference": event.legalOrder.reference,
  };
  return values[path];
}

function transformValue(
  rule: MappingRule,
  value: unknown,
  relationship: PropertyRelationship | undefined,
): unknown {
  switch (rule.transform) {
    case "identity":
      return value;
    case "court_property_reference":
      return `COURT-PROP-${String(value)}`;
    case "relationship_registration_id":
      return relationship?.registrationPropertyId;
    case "event_to_dispatch_status":
      return "DISPATCHED";
    case "event_to_instrument_type":
      return "COURT_ORDER";
    case "event_to_mutation_flag":
      return true;
  }
}

function mappingEvidence(event: CanonicalEvent, sourcePath: string): EvidenceRef[] {
  const leaf = sourcePath.split(".").at(-1)?.toLocaleLowerCase() ?? "";
  const matches = event.evidence.filter((evidence) =>
    evidence.field.toLocaleLowerCase().replaceAll("_", "").includes(leaf.replaceAll("_", "")),
  );
  return matches.length > 0 ? matches : event.evidence.slice(0, 1);
}

export function buildSemanticActionGraph(
  workflowId: string,
  event: CanonicalEvent,
  resolution: ResolutionResult,
  registry: InteroperabilityRegistry,
): InteroperabilityGraph {
  const relationship = registry.relationships.find(
    (candidate) =>
      candidate.canonicalPropertyReference === event.property.declaredReference &&
      candidate.legalOrderReference === event.legalOrder.reference,
  );
  const actions = registry.actions.map((config) => {
    const entityMatch = resolution.matches.find((match) => match.system === config.system)!;
    const mappings = config.mappings.map((rule) => ({
      ruleId: rule.ruleId,
      sourcePath: rule.sourcePath,
      targetField: rule.targetField,
      transform: rule.transform,
      rationale: rule.rationale,
      confidence: 1,
      approved: true,
      evidence: mappingEvidence(event, rule.sourcePath),
    }));
    const payload = Object.fromEntries(
      config.mappings
        .map((rule) => [
          rule.targetField,
          transformValue(rule, sourceValue(event, rule.sourcePath), relationship),
        ])
        .filter((entry) => entry[1] !== undefined),
    );
    return {
      id: `ACT-${config.system.toUpperCase()}`,
      system: config.system,
      operation: config.operation,
      schemaVersion: config.schemaVersion,
      recordIdentifier: entityMatch.recordIdentifier,
      entityMatch,
      mappings,
      payload,
      validation: [],
      execution: { status: "NOT_STARTED" as const },
    };
  });
  return InteroperabilityGraphSchema.parse({
    id: `SAG-${workflowId.replace("WRK-", "")}`,
    workflowId,
    eventId: event.id,
    route: ["court", "registration", "revenue"],
    automaticThreshold: registry.automaticThreshold,
    status: resolution.status === "MATCHED" ? "PENDING_VALIDATION" : "BLOCKED",
    actions,
  });
}
