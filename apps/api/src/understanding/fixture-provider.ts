import type { CanonicalEventProposal, UnderstandingInput } from "@omni-route/shared";

import { UnderstandingError, type UnderstandingProvider } from "./service.js";

const fixtureProposal: CanonicalEventProposal = {
  eventType: "PROPERTY_OWNERSHIP_TRANSFER",
  ownerName: "Raju",
  property: {
    declaredReference: "45",
    surveyNumber: "45/2",
    village: "Sampige",
    district: "Bengaluru Rural",
  },
  legalOrderReference: "ORD-123",
  evidence: {
    ownerName: "Raju",
    propertyReference: "45",
    legalOrderReference: "ORD-123",
  },
};

function matchesSupportedFixture(text: string): boolean {
  return /\braju\b/i.test(text) && /\b45(?:\/2)?\b/.test(text) && /\bord-123\b/i.test(text);
}

export class FixtureUnderstandingProvider implements UnderstandingProvider {
  readonly id = "fixture" as const;
  readonly model = "fixture-v1";

  async extract(input: UnderstandingInput): Promise<unknown> {
    if (!matchesSupportedFixture(input.text)) {
      throw new UnderstandingError(
        "UNSUPPORTED_FIXTURE_INPUT",
        "Fixture mode supports only the committed synthetic ORD-123 property-transfer scenario.",
      );
    }
    return structuredClone(fixtureProposal);
  }
}
