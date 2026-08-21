import {
  ResolutionResultSchema,
  type CanonicalEvent,
  type CourtRecord,
  type EntityMatch,
  type RegistrationRecord,
  type RevenueRecord,
  type SystemName,
} from "@omni-route/shared";

import type { PropertyRelationship } from "./registry.js";
export type { PropertyRelationship } from "./registry.js";

type CandidateRecords = {
  court: CourtRecord[];
  registration: RegistrationRecord[];
  revenue: RevenueRecord[];
};

const weights = { legalOrder: 0.35, property: 0.3, location: 0.2, eligibility: 0.15 } as const;
const normalize = (value: string | undefined | null) =>
  value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";

function signal(
  ruleId: string,
  label: string,
  weight: number,
  expected: string,
  actual: string,
  hardConflict = false,
) {
  const matches = normalize(expected) === normalize(actual);
  return {
    ruleId,
    label,
    weight,
    outcome: hardConflict
      ? ("CONFLICT" as const)
      : matches
        ? ("MATCH" as const)
        : ("MISS" as const),
    expected,
    actual: actual || "missing",
  };
}

function scoreCandidate(
  system: SystemName,
  record: CourtRecord | RegistrationRecord | RevenueRecord,
  event: CanonicalEvent,
  relationship: PropertyRelationship | undefined,
) {
  const expectedIdentifier =
    relationship === undefined
      ? ""
      : system === "court"
        ? relationship.courtOrderReference
        : system === "registration"
          ? relationship.registrationPropertyId
          : relationship.revenueSurveyNumber;
  const identifier =
    system === "court"
      ? (record as CourtRecord).order_ref
      : system === "registration"
        ? (record as RegistrationRecord).property_id
        : (record as RevenueRecord).survey_no;
  const legalActual =
    system === "court"
      ? (record as CourtRecord).order_ref
      : system === "registration"
        ? identifier === relationship?.registrationPropertyId
          ? relationship.legalOrderReference
          : ((record as RegistrationRecord).court_order_ref ?? "")
        : (record as RevenueRecord).supporting_order_ref;
  const villageActual =
    system === "court"
      ? (record as CourtRecord).village_name
      : system === "registration"
        ? (record as RegistrationRecord).locality
        : (record as RevenueRecord).revenue_village;
  const districtActual =
    system === "court"
      ? (record as CourtRecord).district_name
      : system === "registration"
        ? (record as RegistrationRecord).district_code
        : (record as RevenueRecord).district;
  const districtExpected =
    system === "registration"
      ? (relationship?.registrationDistrictCode ?? event.property.district ?? "")
      : (event.property.district ?? "");
  const locationMatches =
    normalize(villageActual) === normalize(event.property.village) &&
    normalize(districtActual) === normalize(districtExpected);
  const eligible =
    system === "court"
      ? (record as CourtRecord).decree_status === "ISSUED"
      : system === "registration"
        ? (record as RegistrationRecord).instrument_type === "SALE"
        : !(record as RevenueRecord).mutation_required;
  const requiredActual =
    system === "revenue" ? identifier : system === "court" ? legalActual : identifier;
  const requiredExpected =
    system === "revenue"
      ? (event.property.surveyNumber ?? relationship?.surveyNumber ?? "")
      : system === "court"
        ? event.legalOrder.reference
        : expectedIdentifier;
  const hardConflict =
    requiredExpected !== "" &&
    normalize(requiredActual) !== normalize(requiredExpected) &&
    (system !== "registration" || identifier === expectedIdentifier);
  const signals = [
    signal(
      "RES-LEGAL-ORDER",
      "Legal-order relationship",
      weights.legalOrder,
      event.legalOrder.reference,
      legalActual,
    ),
    signal(
      "RES-PROPERTY",
      "Property relationship",
      weights.property,
      expectedIdentifier,
      identifier,
      hardConflict,
    ),
    {
      ruleId: "RES-LOCATION",
      label: "Village and district consistency",
      weight: weights.location,
      outcome: locationMatches ? ("MATCH" as const) : ("MISS" as const),
      expected: `${event.property.village ?? "missing"} / ${districtExpected || "missing"}`,
      actual: `${villageActual} / ${districtActual}`,
    },
    {
      ruleId: "RES-ELIGIBILITY",
      label: "Operation eligibility",
      weight: weights.eligibility,
      outcome: eligible ? ("MATCH" as const) : ("MISS" as const),
      expected: "eligible",
      actual: eligible ? "eligible" : "ineligible",
    },
  ];
  const score = Number(
    signals
      .filter((item) => item.outcome === "MATCH")
      .reduce((sum, item) => sum + item.weight, 0)
      .toFixed(2),
  );
  return { identifier, score, signals, hardConflict };
}

function resolveSystem(
  system: SystemName,
  candidates: Array<CourtRecord | RegistrationRecord | RevenueRecord>,
  event: CanonicalEvent,
  relationship: PropertyRelationship | undefined,
  threshold: number,
): EntityMatch {
  if (candidates.length === 0)
    return { system, recordIdentifier: null, score: 0, threshold, status: "NO_MATCH", signals: [] };
  const scored = candidates
    .map((candidate) => scoreCandidate(system, candidate, event, relationship))
    .sort((left, right) => right.score - left.score);
  const best = scored[0]!;
  if (best.hardConflict)
    return {
      system,
      recordIdentifier: best.identifier,
      score: best.score,
      threshold,
      status: "CONFLICT",
      signals: best.signals,
    };
  const tied = scored.filter(
    (candidate) => candidate.score === best.score && candidate.score >= threshold,
  );
  if (tied.length > 1)
    return {
      system,
      recordIdentifier: null,
      score: best.score,
      threshold,
      status: "AMBIGUOUS",
      signals: best.signals,
    };
  return {
    system,
    recordIdentifier: best.identifier,
    score: best.score,
    threshold,
    status: best.score >= threshold ? "MATCH" : "BELOW_THRESHOLD",
    signals: best.signals,
  };
}

export function resolvePropertyRecords(
  event: CanonicalEvent,
  records: CandidateRecords,
  relationships: PropertyRelationship[],
  threshold: number,
) {
  const relationship = relationships.find(
    (candidate) =>
      normalize(candidate.canonicalPropertyReference) ===
        normalize(event.property.declaredReference) &&
      normalize(candidate.legalOrderReference) === normalize(event.legalOrder.reference),
  );
  const matches = [
    resolveSystem("court", records.court, event, relationship, threshold),
    resolveSystem("registration", records.registration, event, relationship, threshold),
    resolveSystem("revenue", records.revenue, event, relationship, threshold),
  ];
  return ResolutionResultSchema.parse({
    status: matches.every((match) => match.status === "MATCH") ? "MATCHED" : "BLOCKED",
    matches,
  });
}
