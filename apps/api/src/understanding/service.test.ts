import { describe, expect, it } from "vitest";

import type { CanonicalEventProposal, UnderstandingRequest } from "@omni-route/shared";

import { CanonicalRuntimeStore } from "../canonical-runtime/runtime-store.js";
import { UnderstandingError, UnderstandingService, type UnderstandingProvider } from "./service.js";

const request: UnderstandingRequest = {
  synthetic: true,
  provider: "fixture",
  input: { kind: "text", text: "Transfer synthetic property 45 to Raju under ORD-123." },
};

const proposal: CanonicalEventProposal = {
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

function provider(output: unknown): UnderstandingProvider {
  return {
    id: "fixture",
    model: "fixture-v1",
    extract: async () => output,
  };
}

describe("UnderstandingService", () => {
  it("validates a proposal, creates canonical entities, and completes understanding", async () => {
    const store = new CanonicalRuntimeStore(() => new Date("2026-08-21T04:30:00.000Z"));
    const service = new UnderstandingService(store, () => provider(proposal));

    const view = await service.createWorkflow(request);

    expect(view.workflow.currentState).toBe("UNDERSTANDING_COMPLETE");
    expect(view.workflow.transitions.map(({ to }) => to)).toEqual([
      "RECEIVED",
      "EXTRACTING",
      "UNDERSTANDING_COMPLETE",
    ]);
    expect(view.event).toMatchObject({
      type: "PROPERTY_OWNERSHIP_TRANSFER",
      effectiveOwner: { name: "Raju" },
      property: { declaredReference: "45", surveyNumber: "45/2" },
      legalOrder: { reference: "ORD-123", source: "synthetic_text" },
      interpretation: { provider: "fixture", model: "fixture-v1" },
    });
    expect(view.graphSnapshots).toEqual([]);
    expect(view.validationResults).toEqual([]);
  });

  it("rejects malformed model output before creating any workflow", async () => {
    const store = new CanonicalRuntimeStore();
    const service = new UnderstandingService(store, () => provider({ owner_nm: "Raju" }));

    await expect(service.createWorkflow(request)).rejects.toMatchObject({
      code: "INVALID_MODEL_OUTPUT",
    });
    expect(store.getWorkflowView("WRK-000001")).toBeUndefined();

    const recovered = new UnderstandingService(store, () => provider(proposal));
    expect((await recovered.createWorkflow(request)).workflow.id).toBe("WRK-000001");
  });

  it("rejects evidence that contradicts the extracted canonical values", async () => {
    const store = new CanonicalRuntimeStore();
    const service = new UnderstandingService(store, () =>
      provider({
        ...proposal,
        evidence: { ...proposal.evidence, ownerName: "Someone not in the input" },
      }),
    );

    await expect(service.createWorkflow(request)).rejects.toMatchObject({
      code: "INVALID_MODEL_OUTPUT",
    });
    expect(store.getWorkflowView("WRK-000001")).toBeUndefined();
  });

  it("keeps text and document interpretations isolated when their text is identical", async () => {
    const store = new CanonicalRuntimeStore();
    const service = new UnderstandingService(store, () => provider(proposal));
    const textView = await service.createWorkflow(request);
    const documentView = await service.createWorkflow({
      ...request,
      input: {
        kind: "document",
        filename: "court-decree.txt",
        contentType: "text/plain",
        text: request.input.text,
      },
    });

    expect(documentView.event.id).not.toBe(textView.event.id);
    expect(store.getWorkflowView(textView.workflow.id)?.event.legalOrder.source).toBe(
      "synthetic_text",
    );
    expect(documentView.event.legalOrder.source).toBe("synthetic_upload");
  });

  it("preserves safe provider error categories without leaking provider details", async () => {
    const failingProvider: UnderstandingProvider = {
      id: "openai",
      model: "configured-model",
      extract: async () => {
        throw new UnderstandingError("PROVIDER_REFUSAL", "Safe refusal message.");
      },
    };
    const service = new UnderstandingService(new CanonicalRuntimeStore(), () => failingProvider);

    await expect(service.createWorkflow(request)).rejects.toEqual(
      new UnderstandingError("PROVIDER_REFUSAL", "Safe refusal message."),
    );
  });
});
