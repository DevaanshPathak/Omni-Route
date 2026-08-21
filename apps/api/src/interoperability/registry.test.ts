import { describe, expect, it } from "vitest";

import { assertSchemaIdentity, loadInteroperabilityRegistry } from "./registry.js";

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
});
