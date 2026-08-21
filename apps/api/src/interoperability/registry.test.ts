import { describe, expect, it } from "vitest";

import { ActiveRegistry, assertSchemaIdentity, loadInteroperabilityRegistry } from "./registry.js";

describe("file-backed interoperability registry", () => {
  it("loads versioned request and response schemas for every target", () => {
    const registry = loadInteroperabilityRegistry();

    expect(registry.actions).toHaveLength(3);
    expect(registry.actions.every((action) => action.jsonSchema.$id === action.schemaVersion)).toBe(
      true,
    );
    expect(
      registry.actions.every(
        (action) => action.responseJsonSchema.$id === action.responseSchemaVersion,
      ),
    ).toBe(true);
  });

  it("fails closed when configured and loaded schema versions disagree", () => {
    expect(() =>
      assertSchemaIdentity({ $id: "revenue.mutation.request.v2" }, "revenue.mutation.request.v1"),
    ).toThrow("Schema identity mismatch");
  });

  it("loads Revenue drift as a versioned contract while retaining approved metadata", () => {
    const registry = loadInteroperabilityRegistry(undefined, "revenue-drift");
    const revenue = registry.actions.find((action) => action.system === "revenue")!;

    expect(revenue.schemaVersion).toBe("revenue.mutation.request.v2-drift");
    expect(revenue.jsonSchema.required).toContain("registered_owner");
    expect(revenue.mappings.some((mapping) => mapping.targetField === "owner_nm")).toBe(true);
    expect(revenue.mappingCandidates).toEqual([
      expect.objectContaining({ targetField: "registered_owner", confidence: 0.61 }),
    ]);
  });

  it("resets the active registry to the baseline scenario", () => {
    const active = new ActiveRegistry();
    active.setMode("revenue-drift");
    expect(active.state().mode).toBe("revenue-drift");

    active.reset();

    expect(active.state().mode).toBe("baseline");
    expect(active.state().availableOwnerField).toBe("owner_nm");
  });
});
