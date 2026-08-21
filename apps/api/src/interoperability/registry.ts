import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DemoSchemaStateSchema,
  SystemNameSchema,
  type DemoSchemaMode,
  type DemoSchemaState,
} from "@omni-route/shared";
import { z } from "zod";

const MappingRuleSchema = z
  .object({
    ruleId: z.string().min(1),
    sourcePath: z.string().min(1),
    targetField: z.string().min(1),
    transform: z.enum([
      "identity",
      "court_property_reference",
      "relationship_registration_id",
      "event_to_dispatch_status",
      "event_to_instrument_type",
      "event_to_mutation_flag",
    ]),
    rationale: z.string().min(1),
  })
  .strict();

const MappingCandidateSchema = MappingRuleSchema.extend({
  confidence: z.number().min(0).max(1),
}).strict();

const MappingConflictConfigSchema = z
  .object({
    expectedApprovedField: z.string().min(1),
    availableUnapprovedField: z.string().min(1),
    candidateConfidence: z.number().min(0).max(1),
  })
  .strict();

const RelationshipSchema = z
  .object({
    canonicalPropertyReference: z.string().min(1),
    surveyNumber: z.string().min(1),
    legalOrderReference: z.string().min(1),
    courtOrderReference: z.string().min(1),
    registrationPropertyId: z.string().min(1),
    registrationDistrictCode: z.string().min(1),
    revenueSurveyNumber: z.string().min(1),
  })
  .strict();

const ActionConfigSchema = z
  .object({
    system: SystemNameSchema,
    operation: z.string().min(1),
    schemaVersion: z.string().min(1),
    schemaFile: z.string().regex(/\.json$/),
    responseSchemaVersion: z.string().min(1),
    responseSchemaFile: z.string().regex(/\.json$/),
    mappings: z.array(MappingRuleSchema).min(1),
    mappingCandidates: z.array(MappingCandidateSchema).optional(),
    mappingConflict: MappingConflictConfigSchema.optional(),
  })
  .strict();

const RegistryFileSchema = z
  .object({
    version: z.enum(["interoperability.v1", "interoperability.revenue-drift.v1"]),
    automaticThreshold: z.number().min(0).max(1),
    relationships: z.array(RelationshipSchema).min(1),
    actions: z.array(ActionConfigSchema).length(3),
  })
  .strict();

export type PropertyRelationship = z.infer<typeof RelationshipSchema>;
export type MappingRule = z.infer<typeof MappingRuleSchema>;
export type MappingCandidate = z.infer<typeof MappingCandidateSchema>;
export type ActionConfig = z.infer<typeof ActionConfigSchema> & {
  jsonSchema: Record<string, unknown>;
  responseJsonSchema: Record<string, unknown>;
};
export type InteroperabilityRegistry = Omit<z.infer<typeof RegistryFileSchema>, "actions"> & {
  actions: ActionConfig[];
};

const defaultSchemaDirectory = fileURLToPath(new URL("../../../../data/schemas/", import.meta.url));

function readJson(directory: string, filename: string): unknown {
  return JSON.parse(readFileSync(join(directory, filename), "utf8"));
}

export function assertSchemaIdentity(schema: Record<string, unknown>, expectedId: string): void {
  if (schema.$id !== expectedId) {
    throw new Error(`Schema identity mismatch: expected ${expectedId}.`);
  }
}

export function loadInteroperabilityRegistry(
  directory = defaultSchemaDirectory,
  mode: DemoSchemaMode = "baseline",
): InteroperabilityRegistry {
  const registry = RegistryFileSchema.parse(
    readJson(
      directory,
      mode === "baseline"
        ? "interoperability.registry.v1.json"
        : "interoperability.registry.revenue-drift.v1.json",
    ),
  );
  return {
    ...registry,
    actions: registry.actions.map((action) => {
      const jsonSchema = z
        .record(z.string(), z.unknown())
        .parse(readJson(directory, action.schemaFile));
      const responseJsonSchema = z
        .record(z.string(), z.unknown())
        .parse(readJson(directory, action.responseSchemaFile));
      assertSchemaIdentity(jsonSchema, action.schemaVersion);
      assertSchemaIdentity(responseJsonSchema, action.responseSchemaVersion);
      return { ...action, jsonSchema, responseJsonSchema };
    }),
  };
}

export class ActiveRegistry {
  readonly #registries: Record<DemoSchemaMode, InteroperabilityRegistry>;
  #mode: DemoSchemaMode = "baseline";

  constructor(baseline?: InteroperabilityRegistry, directory = defaultSchemaDirectory) {
    this.#registries = {
      baseline: baseline ?? loadInteroperabilityRegistry(directory, "baseline"),
      "revenue-drift": loadInteroperabilityRegistry(directory, "revenue-drift"),
    };
  }

  current(): InteroperabilityRegistry {
    return this.#registries[this.#mode];
  }

  setMode(mode: DemoSchemaMode): DemoSchemaState {
    this.#mode = mode;
    return this.state();
  }

  reset(): DemoSchemaState {
    this.#mode = "baseline";
    return this.state();
  }

  state(): DemoSchemaState {
    const registry = this.current();
    const revenue = registry.actions.find((action) => action.system === "revenue");
    if (revenue === undefined) throw new Error("Revenue action is missing from the registry.");
    const approvedOwnerField =
      revenue.mappings.find((mapping) => mapping.sourcePath === "effectiveOwner.name")
        ?.targetField ?? "unknown";
    const conflict = revenue.mappingConflict;
    return DemoSchemaStateSchema.parse({
      mode: this.#mode,
      registryVersion: registry.version,
      revenueSchemaVersion: revenue.schemaVersion,
      approvedOwnerField,
      availableOwnerField: conflict?.availableUnapprovedField ?? approvedOwnerField,
      candidateConfidence: conflict?.candidateConfidence ?? null,
      automaticThreshold: registry.automaticThreshold,
    });
  }
}
