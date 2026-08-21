import { readFileSync } from "node:fs";

import { CanonicalEventSchema, type CanonicalEvent } from "@omni-route/shared";

const fixtureUrl = new URL(
  "../../../../fixtures/canonical/property-transfer.event.v1.json",
  import.meta.url,
);

export function loadCanonicalEventFixture(): CanonicalEvent {
  const rawFixture: unknown = JSON.parse(readFileSync(fixtureUrl, "utf8"));
  return CanonicalEventSchema.parse(rawFixture);
}
