import { describe, expect, it } from "vitest";

import {
  CourtDispatchRequestSchema,
  RegistrationTransferRequestSchema,
  RevenueMutationRequestSchema,
} from "@omni-route/shared";

import { loadInteroperabilityRegistry } from "./registry.js";
import { buildSemanticActionGraph } from "./mapper.js";
import { resolvePropertyRecords } from "./resolver.js";
import { loadCanonicalEventFixture } from "../canonical-runtime/fixture-loader.js";
import { loadSeedBundle } from "../mock-systems/seed-loader.js";

describe("approved semantic mapper", () => {
  it("builds three non-executable payload previews from file-backed rules", () => {
    const registry = loadInteroperabilityRegistry();
    const event = loadCanonicalEventFixture();
    const resolution = resolvePropertyRecords(
      event,
      loadSeedBundle(),
      registry.relationships,
      registry.automaticThreshold,
    );
    const graph = buildSemanticActionGraph("WRK-TEST", event, resolution, registry);

    expect(graph.status).toBe("PENDING_VALIDATION");
    expect(graph.actions).toHaveLength(3);
    expect(graph.actions.find((action) => action.system === "court")?.payload).toEqual({
      property_ref: "COURT-PROP-45",
      beneficiary: "Raju",
      decree_status: "DISPATCHED",
    });
    expect(graph.actions.find((action) => action.system === "registration")?.payload).toEqual({
      document_no: "ORD-123",
      property_id: "REG-2391",
      buyer_name: "Raju",
      instrument_type: "COURT_ORDER",
    });
    expect(graph.actions.find((action) => action.system === "revenue")?.payload).toEqual({
      survey_no: "45/2",
      owner_nm: "Raju",
      mutation_required: true,
    });
    expect(
      graph.actions.every((action) => action.mappings.every((mapping) => mapping.approved)),
    ).toBe(true);
    expect(() => CourtDispatchRequestSchema.parse(graph.actions[0]!.payload)).not.toThrow();
    expect(() => RegistrationTransferRequestSchema.parse(graph.actions[1]!.payload)).not.toThrow();
    expect(() => RevenueMutationRequestSchema.parse(graph.actions[2]!.payload)).not.toThrow();
  });
});
