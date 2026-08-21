import { createHash } from "node:crypto";

import {
  CanonicalEventProposalSchema,
  CanonicalEventSchema,
  UnderstandingRequestSchema,
  type CanonicalEvent,
  type CanonicalWorkflowView,
  type UnderstandingErrorCode,
  type UnderstandingInput,
  type UnderstandingProviderSelection,
  type UnderstandingRequest,
} from "@omni-route/shared";

import type { CanonicalRuntimeStore } from "../canonical-runtime/runtime-store.js";

export const EXTRACTION_PROMPT_VERSION = "property-transfer-extraction.v1";

export type UnderstandingProvider = {
  readonly id: "openai" | "fixture";
  readonly model: string;
  extract(input: UnderstandingInput): Promise<unknown>;
};

export type UnderstandingProviderResolver = (
  selection: UnderstandingProviderSelection,
) => UnderstandingProvider;

export class UnderstandingError extends Error {
  constructor(
    readonly code: UnderstandingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UnderstandingError";
  }
}

function canonicalSuffix(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
}

function canonicalizeProposal(
  rawProposal: unknown,
  input: UnderstandingInput,
  provider: UnderstandingProvider,
): CanonicalEvent {
  const parsed = CanonicalEventProposalSchema.safeParse(rawProposal);
  if (!parsed.success) {
    throw new UnderstandingError(
      "INVALID_MODEL_OUTPUT",
      "The extraction provider returned data outside the canonical proposal contract.",
    );
  }

  const proposal = parsed.data;
  const evidenceMatchesProposal =
    proposal.evidence.ownerName === proposal.ownerName &&
    proposal.evidence.propertyReference === proposal.property.declaredReference &&
    proposal.evidence.legalOrderReference === proposal.legalOrderReference;
  const normalizedInput = input.text.toLocaleLowerCase();
  const evidenceAppearsInInput = Object.values(proposal.evidence).every((value) =>
    normalizedInput.includes(value.toLocaleLowerCase()),
  );
  if (!evidenceMatchesProposal || !evidenceAppearsInInput) {
    throw new UnderstandingError(
      "INVALID_MODEL_OUTPUT",
      "The extraction proposal contained missing or contradictory source evidence.",
    );
  }
  const suffix = canonicalSuffix({
    inputKind: input.kind,
    provider: provider.id,
    text: input.text.trim(),
    proposal,
  });
  const documentId = `DOC-${suffix}`;
  const evidence = [
    {
      source: documentId,
      field: "effective_owner.name",
      value: proposal.evidence.ownerName,
    },
    {
      source: documentId,
      field: "property.declared_reference",
      value: proposal.evidence.propertyReference,
    },
    {
      source: documentId,
      field: "legal_order.reference",
      value: proposal.evidence.legalOrderReference,
    },
  ];

  return CanonicalEventSchema.parse({
    id: `EVT-${suffix}`,
    type: proposal.eventType,
    effectiveOwner: { id: `PER-${suffix}`, name: proposal.ownerName },
    property: {
      id: `PRO-${suffix}`,
      declaredReference: proposal.property.declaredReference,
      ...(proposal.property.surveyNumber === null
        ? {}
        : { surveyNumber: proposal.property.surveyNumber }),
      ...(proposal.property.village === null ? {} : { village: proposal.property.village }),
      ...(proposal.property.district === null ? {} : { district: proposal.property.district }),
    },
    legalOrder: {
      id: documentId,
      type: "COURT_DECREE",
      reference: proposal.legalOrderReference,
      source: input.kind === "document" ? "synthetic_upload" : "synthetic_text",
      evidence: [evidence[2]],
    },
    interpretation: {
      provider: provider.id,
      model: provider.model,
      promptVersion: EXTRACTION_PROMPT_VERSION,
    },
    evidence,
  });
}

export class UnderstandingService {
  constructor(
    private readonly store: CanonicalRuntimeStore,
    private readonly resolveProvider: UnderstandingProviderResolver,
  ) {}

  async createWorkflow(rawRequest: UnderstandingRequest): Promise<CanonicalWorkflowView> {
    const request = UnderstandingRequestSchema.parse(rawRequest);
    const provider = this.resolveProvider(request.provider);
    let rawProposal: unknown;

    try {
      rawProposal = await provider.extract(request.input);
    } catch (error) {
      if (error instanceof UnderstandingError) throw error;
      throw new UnderstandingError(
        "PROVIDER_FAILURE",
        "The extraction provider could not complete the request.",
      );
    }

    const event = canonicalizeProposal(rawProposal, request.input, provider);
    const created = this.store.createWorkflow(event);
    this.store.transitionWorkflow(created.workflow.id, "EXTRACTING");
    this.store.transitionWorkflow(created.workflow.id, "UNDERSTANDING_COMPLETE");
    return this.store.getWorkflowView(created.workflow.id)!;
  }
}
