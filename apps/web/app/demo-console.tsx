"use client";

import {
  ApiErrorResponseSchema,
  CanonicalWorkflowResponseSchema,
  DemoSchemaStateResponseSchema,
  SyntheticSystemSnapshotResponseSchema,
  WorkflowTraceResponseSchema,
  type CanonicalWorkflowView,
  type DemoSchemaMode,
  type DemoSchemaState,
  type SemanticAction,
  type SyntheticSystemSnapshot,
  type UnderstandingProviderSelection,
  type WorkflowTrace,
} from "@omni-route/shared";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";

const demoDecree = `SYNTHETIC DEMO DOCUMENT - NOT A REAL COURT ORDER

Order reference: ORD-123
Event: Property ownership transfer
Property reference: 45
Revenue survey number: 45/2
Village: Sampige
District: Bengaluru Rural
Beneficiary: Raju

For the Omni-Route hackathon demonstration, ownership of the synthetic property described above is ordered to transfer to Raju.`;

const providerOptions: ReadonlyArray<{
  value: UnderstandingProviderSelection;
  label: string;
  note: string;
}> = [
  { value: "fixture", label: "Deterministic fixture", note: "Repeatable and offline" },
  { value: "auto", label: "Auto", note: "Live model when configured" },
  { value: "openai", label: "Live model", note: "Requires server configuration" },
];

const journeySteps = [
  "Understand",
  "Discover",
  "Resolve",
  "Map",
  "Validate",
  "Execute",
  "Verify",
] as const;
type RequestState = "idle" | "loading" | "success" | "error";
type Language = "en" | "hi" | "kn";
type ViewMode = "citizen" | "judge";

const translations: Record<
  Language,
  {
    portalTitle: string;
    portalSubtitle: string;
    viewCitizen: string;
    viewJudge: string;
    submitTab: string;
    uploadDropzoneLabel: string;
    uploadSubtext: string;
    presetButton: string;
    processButton: string;
    runningWorkflow: string;
    resetButton: string;
    citizenResultTitle: string;
    citizenResultSubtitleSuccess: string;
    citizenResultSubtitleReview: string;
    certificateTitle: string;
    certificateRef: string;
    ownerName: string;
    propertyRef: string;
    orderRef: string;
    verifiedBadge: string;
    advancedSettings: string;
    graphTitle: string;
    graphSubtitle: string;
    submittedDocument: string;
    targetBeneficiary: string;
    dept1Title: string;
    dept2Title: string;
    dept3Title: string;
    deptLabel: string;
    matchedOrder: string;
    orderStatus: string;
    propertyTitleId: string;
    registeredOwner: string;
    taxSurveyPlot: string;
    mutationRecord: string;
    badgeCourt: string;
    badgeReg: string;
    badgeRev: string;
    badgeBlocked: string;
    processing: string;
    journeyTitle: string;
    journeySubtitle: string;
    steps: readonly [string, string, string, string, string, string, string];
    eventLabel: string;
    personLabel: string;
    propertyLabel: string;
    orderLabel: string;
    ownershipTransferEvent: string;
  }
> = {
  en: {
    portalTitle: "Citizen Land Transfer Portal",
    portalSubtitle:
      "Submit your court decree once to safely update records across Court, Registration, and Revenue departments.",
    viewCitizen: "Citizen Portal View",
    viewJudge: "Technical Audit Mode (Judges)",
    submitTab: "Submit Court Decree / Intent",
    uploadDropzoneLabel: "Drop your Court Order (.txt, .pdf, .jpg) or click to browse",
    uploadSubtext: "Supports text documents, scans, and court decree text files up to 12,000 characters",
    presetButton: "Load Sample Court Decree",
    processButton: "Complete Ownership Transfer",
    runningWorkflow: "Verifying across departments...",
    resetButton: "Reset Portal",
    citizenResultTitle: "Unified Citizen Outcome",
    citizenResultSubtitleSuccess:
      "Your property ownership transfer has been accepted and verified across Court, Registration, and Revenue records.",
    citizenResultSubtitleReview:
      "Safety checks blocked automatic updates due to a database schema mismatch. Marked for official human review.",
    certificateTitle: "Official Ownership Transfer Verification Certificate",
    certificateRef: "Workflow Reference",
    ownerName: "Verified Owner",
    propertyRef: "Property Reference",
    orderRef: "Legal Order Reference",
    verifiedBadge: "Verified Across 3 Government Departments",
    advancedSettings: "Advanced Technical & Provider Settings",
    graphTitle: "Visual Citizen Journey",
    graphSubtitle: "Single Event → Multi-Department Execution Flow",
    submittedDocument: "Submitted Legal Document",
    targetBeneficiary: "Target Beneficiary",
    dept1Title: "Court Order Registry",
    dept2Title: "Land Registration Office",
    dept3Title: "Revenue & Tax Registry",
    deptLabel: "Department",
    matchedOrder: "Matched Order",
    orderStatus: "Order Status",
    propertyTitleId: "Property Title ID",
    registeredOwner: "Registered Owner",
    taxSurveyPlot: "Tax Survey Plot",
    mutationRecord: "Mutation Record",
    badgeCourt: "✓ Order Dispatched",
    badgeReg: "✓ Land Title Updated",
    badgeRev: "✓ Record Mutated",
    badgeBlocked: "! Blocked for Review",
    processing: "Processing...",
    journeyTitle: "Citizen Journey",
    journeySubtitle: "One event, seven controlled stages",
    steps: ["Understand", "Discover", "Resolve", "Map", "Validate", "Execute", "Verify"],
    eventLabel: "Event",
    personLabel: "Person",
    propertyLabel: "Property",
    orderLabel: "Order",
    ownershipTransferEvent: "Property Ownership Transfer",
  },
  hi: {
    portalTitle: "नागरिक संपत्ति हस्तांतरण पोर्टल",
    portalSubtitle:
      "अदालत के आदेश को एक बार जमा करें और न्यायालय, पंजीकरण एवं राजस्व विभागों में रिकॉर्ड सुरक्षित रूप से अपडेट करें।",
    viewCitizen: "नागरिक पोर्टल दृश्य",
    viewJudge: "तकनीकी लेखापरीक्षा मोड (न्यायाधीश)",
    submitTab: "कोर्ट ऑर्डर जमा करें",
    uploadDropzoneLabel: "अपना कोर्ट ऑर्डर (.txt, .pdf, .jpg) यहां ड्राप करें या ब्राउज़ करें",
    uploadSubtext: "टेक्स्ट दस्तावेज़ों और स्कैन किए गए अदालती आदेशों का समर्थन करता है",
    presetButton: "नमूना कोर्ट आदेश लोड करें",
    processButton: "स्वामित्व हस्तांतरण पूरा करें",
    runningWorkflow: "विभागों में सत्यापन हो रहा है...",
    resetButton: "पोर्टल रीसेट करें",
    citizenResultTitle: "एककीकृत नागरिक परिणाम",
    citizenResultSubtitleSuccess:
      "आपका संपत्ति स्वामित्व हस्तांतरण न्यायालय, पंजीकरण और राजस्व रिकॉर्ड में स्वीकृत और सत्यापित हो गया है।",
    citizenResultSubtitleReview:
      "डेटाबेस विसंगति के कारण स्वचालित अपडेट रोक दिया गया है। मानव समीक्षा के लिए चिह्नित।",
    certificateTitle: "आधिकारिक स्वामित्व हस्तांतरण सत्यापन प्रमाण पत्र",
    certificateRef: "कार्यप्रवाह संदर्भ संख्या",
    ownerName: "सत्यापित स्वामी",
    propertyRef: "संपत्ति संदर्भ",
    orderRef: "कानूनी आदेश संदर्भ",
    verifiedBadge: "3 सरकारी विभागों में सत्यापित",
    advancedSettings: "उन्नत प्रदाता और तकनीकी सेटिंग्स",
    graphTitle: "दृश्य नागरिक यात्रा",
    graphSubtitle: "एक घटना → बहु-विभाग निष्पादन प्रवाह",
    submittedDocument: "प्रस्तुत कानूनी दस्तावेज़",
    targetBeneficiary: "लक्षित लाभार्थी",
    dept1Title: "न्यायालय आदेश रजिस्ट्री",
    dept2Title: "भूमि पंजीकरण कार्यालय",
    dept3Title: "राजस्व एवं कर रजिस्ट्री",
    deptLabel: "विभाग",
    matchedOrder: "मिलान किया गया आदेश",
    orderStatus: "आदेश की स्थिति",
    propertyTitleId: "संपत्ति शीर्षक आईडी",
    registeredOwner: "पंजीकृत स्वामी",
    taxSurveyPlot: "कर सर्वेक्षण भूखंड",
    mutationRecord: "नामांतरण रिकॉर्ड",
    badgeCourt: "✓ आदेश प्रेषित",
    badgeReg: "✓ भूमि शीर्षक अद्यतन",
    badgeRev: "✓ रिकॉर्ड नामांतरित",
    badgeBlocked: "! समीक्षा के लिए अवरुद्ध",
    processing: "प्रसंस्करणीय...",
    journeyTitle: "नागरिक यात्रा",
    journeySubtitle: "एक घटना, सात नियंत्रित चरण",
    steps: ["समझें", "खोजें", "हल करें", "मानचित्रित करें", "सत्यापित करें", "निष्पादित करें", "जांचें"],
    eventLabel: "घटना",
    personLabel: "व्यक्ति",
    propertyLabel: "संपत्ति",
    orderLabel: "आदेश",
    ownershipTransferEvent: "संपत्ति स्वामित्व हस्तांतरण",
  },
  kn: {
    portalTitle: "ನಾಗರಿಕ ಆಸ್ತಿ ವರ್ಗಾವಣೆ ಪೋರ್ಟಲ್",
    portalSubtitle:
      "ನ್ಯಾಯಾಲಯದ ಆದೇಶವನ್ನು ಒಮ್ಮೆ ಸಲ್ಲಿಸಿ ಮತ್ತು ನ್ಯಾಯಾಲಯ, ನೋಂದಣಿ ಮತ್ತು ಕಂದಾಯ ಇಲಾಖೆಗಳಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ನವೀಕರಿಸಿ.",
    viewCitizen: "ನಾಗರಿಕ ಪೋರ್ಟಲ್ ನೋಟ",
    viewJudge: "ತಾಂತ್ರಿಕ ತನಿಖೆ ಮೋಡ್ (ನ್ಯಾಯಾಧೀಶರು)",
    submitTab: "ನ್ಯಾಯಾಲಯದ ಆದೇಶ ಸಲ್ಲಿಸಿ",
    uploadDropzoneLabel: "ನಿಮ್ಮ ಕೋರ್ಟ್ ಆರ್ಡರ್ (.txt, .pdf, .jpg) ಅನ್ನು ಇಲ್ಲಿ ಡ್ರಾಪ್ ಮಾಡಿ",
    uploadSubtext: "ಪಠ್ಯ ದಾಖಲೆಗಳು ಮತ್ತು ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಕೋರ್ಟ್ ಆದೇಶಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ",
    presetButton: "ಮಾದರಿ ಕೋರ್ಟ್ ಆದೇಶ ಲೋಡ್ ಮಾಡಿ",
    processButton: "ಮಾಲೀಕತ್ವ ವರ್ಗಾವಣೆ ಪೂರ್ಣಗೊಳಿಸಿ",
    runningWorkflow: "ಇಲಾಖೆಗಳಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    resetButton: "ಪೋರ್ಟಲ್ ಮರುಹೊಂದಿಸಿ",
    citizenResultTitle: "ಏಕೀಕೃತ ನಾಗರಿಕ ಫಲಿತಾಂಶ",
    citizenResultSubtitleSuccess:
      "ನಿಮ್ಮ ಆಸ್ತಿ ಮಾಲೀಕತ್ವ ವರ್ಗಾವಣೆಯನ್ನು ನ್ಯಾಯಾಲಯ, ನೋಂದಣಿ ಮತ್ತು ಕಂದಾಯ ದಾಖಲೆಗಳಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
    citizenResultSubtitleReview:
      "ಡೇಟಾಬೇಸ್ ವ್ಯತ್ಯಾಸದಿಂದಾಗಿ ಸ್ವಯಂಚಾಲಿತ ನವೀಕರಣ ತಡೆಯಲಾಗಿದೆ. ಮಾನವ ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸಲಾಗಿದೆ.",
    certificateTitle: "ಅಧಿಕೃತ ಮಾಲೀಕತ್ವ ವರ್ಗಾವಣೆ ದೃಢೀಕರಣ ಪ್ರಮಾಣಪತ್ರ",
    certificateRef: "ವರ್ಕ್‌ಫ್ಲೋ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ",
    ownerName: "ದೃಢೀಕರಿಸಿದ ಮಾಲೀಕರು",
    propertyRef: "ಆಸ್ತಿ ಉಲ್ಲೇಖ",
    orderRef: "ಕಾನೂನು ಆದೇಶ ಉಲ್ಲೇಖ",
    verifiedBadge: "3 ಸರ್ಕಾರಿ ಇಲಾಖೆಗಳಲ್ಲಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ",
    advancedSettings: "ಸುಧಾರಿತ ತಾಂತ್ರಿಕ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    graphTitle: "ದೃಶ್ಯ ನಾಗರಿಕ ಪ್ರಯಾಣ",
    graphSubtitle: "ಒಂದೇ ಘಟನೆ → ಬಹು-ಇಲಾಖೆ ಕಾರ್ಯಗತಗೊಳಿಸುವಿಕೆ ಹರಿವು",
    submittedDocument: "ಸಲ್ಲಿಸಿದ ಕಾನೂನು ದಾಖಲೆ",
    targetBeneficiary: "ಗುರಿಯ ಫಲಾನುಭವಿ",
    dept1Title: "ನ್ಯಾಯಾಲಯದ ಆದೇಶ ನೋಂದಣಿ",
    dept2Title: "ಭೂ ನೋಂದಣಿ ಕಚೇರಿ",
    dept3Title: "ಕಂದಾಯ ಮತ್ತು ತೆರಿಗೆ ನೋಂದಣಿ",
    deptLabel: "ಇಲಾಖೆ",
    matchedOrder: "ಹೊಂದಾಣಿಕೆಯಾದ ಆದೇಶ",
    orderStatus: "ಆದೇಶದ ಸ್ಥಿತಿ",
    propertyTitleId: "ಆಸ್ತಿ ಶೀರ್ಷಿಕೆ ಐಡಿ",
    registeredOwner: "ನೋಂದಾಯಿತ ಮಾಲೀಕರು",
    taxSurveyPlot: "ತೆರಿಗೆ ಸಮೀಕ್ಷೆ ನಿವೇಶನ",
    mutationRecord: "ರೂಪಾಂತರ ದಾಖಲೆ",
    badgeCourt: "✓ ಆದೇಶ ರವಾನಿಸಲಾಗಿದೆ",
    badgeReg: "✓ ಭೂ ಶೀರ್ಷಿಕೆ ನವೀಕರಿಸಲಾಗಿದೆ",
    badgeRev: "✓ ದಾಖಲೆ ನವೀಕರಿಸಲಾಗಿದೆ",
    badgeBlocked: "! ಪರಿಶೀಲನೆಗೆ ತಡೆಯಲಾಗಿದೆ",
    processing: "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ...",
    journeyTitle: "ನಾಗರಿಕ ಪ್ರಯಾಣ",
    journeySubtitle: "ಒಂದೇ ಘಟನೆ, ಏಳು ನಿಯಂತ್ರಿತ ಹಂತಗಳು",
    steps: [
      "ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ",
      "ಕಂಡುಹಿಡಿಯಿರಿ",
      "ಪರಿಹರಿಸಿ",
      "ಮ್ಯಾಪ್ ಮಾಡಿ",
      "ದೃಢೀಕರಿಸಿ",
      "ಕಾರ್ಯಗತಗೊಳಿಸಿ",
      "ಪರಿಶೀಲಿಸಿ",
    ],
    eventLabel: "ಘಟನೆ",
    personLabel: "ವ್ಯಕ್ತಿ",
    propertyLabel: "ಆಸ್ತಿ",
    orderLabel: "ಆದೇಶ",
    ownershipTransferEvent: "ಆಸ್ತಿ ಮಾಲೀಕತ್ವ ವರ್ಗಾವಣೆ",
  },
};

function errorMessage(body: unknown, fallback: string): string {
  const parsed = ApiErrorResponseSchema.safeParse(body);
  return parsed.success ? parsed.data.error.message : fallback;
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function SystemCard({
  name,
  fields,
  outcome,
}: {
  name: string;
  fields: ReadonlyArray<readonly [string, string]>;
  outcome?: string;
}) {
  return (
    <article className="system-card">
      <div className="system-card-heading">
        <h3>{name}</h3>
        <span>{outcome ?? "Seeded"}</span>
      </div>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function SystemSnapshot({
  snapshot,
  trace,
}: {
  snapshot: SyntheticSystemSnapshot | null;
  trace: WorkflowTrace | null;
}) {
  if (snapshot === null)
    return <p className="muted-copy">Loading the three synthetic records...</p>;
  const statusFor = (system: string) =>
    trace?.graph.actions.find((action) => action.system === system)?.execution.status;
  return (
    <div className="system-grid">
      <SystemCard
        name="Court"
        outcome={statusFor("court")}
        fields={[
          ["order_ref", snapshot.court.order_ref],
          ["property_ref", snapshot.court.property_ref],
          ["beneficiary", snapshot.court.beneficiary],
          ["decree_status", snapshot.court.decree_status],
        ]}
      />
      <SystemCard
        name="Registration"
        outcome={statusFor("registration")}
        fields={[
          ["property_id", snapshot.registration.property_id],
          ["buyer_name", snapshot.registration.buyer_name],
          ["instrument_type", snapshot.registration.instrument_type],
          ["court_order_ref", snapshot.registration.court_order_ref ?? "none"],
        ]}
      />
      <SystemCard
        name="Revenue"
        outcome={statusFor("revenue")}
        fields={[
          ["survey_no", snapshot.revenue.survey_no],
          ["owner_nm", snapshot.revenue.owner_nm],
          ["mutation_required", String(snapshot.revenue.mutation_required)],
          ["supporting_order_ref", snapshot.revenue.supporting_order_ref],
        ]}
      />
    </div>
  );
}

function JourneyProgress({
  activeStep,
  trace,
  steps,
}: {
  activeStep: number;
  trace: WorkflowTrace | null;
  steps: readonly [string, string, string, string, string, string, string];
}) {
  const reachedStates = new Set(
    trace?.workflow.workflow.transitions.map((transition) => transition.to),
  );
  const requiredStates = [
    "UNDERSTANDING_COMPLETE",
    "UNDERSTANDING_COMPLETE",
    "RESOLVING",
    "MAPPING",
    "VALIDATING",
    "EXECUTING",
    "VERIFYING",
  ] as const;
  const failedStep = trace?.graph.actions.some((action) => action.entityMatch.status !== "MATCH")
    ? 2
    : trace?.graph.actions.some((action) =>
          action.validation.some((rule) => rule.outcome === "FAIL"),
        )
      ? 4
      : trace?.workflow.workflow.currentState === "PARTIALLY_COMPLETED"
        ? 5
        : trace?.workflow.workflow.currentState === "FAILED"
          ? reachedStates.has("VERIFYING")
            ? 6
            : 5
          : -1;
  return (
    <ol className="journey-progress" aria-label="Workflow progress">
      {steps.map((step, index) => {
        const state =
          index === failedStep
            ? "failed"
            : trace !== null && reachedStates.has(requiredStates[index]!)
              ? "complete"
              : index === activeStep
                ? "active"
                : "pending";
        return (
          <li className={`journey-step journey-step-${state}`} key={step}>
            <span aria-hidden="true">
              {state === "complete" ? "✓" : state === "failed" ? "×" : index + 1}
            </span>
            <small>{step}</small>
            <b className="sr-only">{state}</b>
          </li>
        );
      })}
    </ol>
  );
}

function ActionTrace({ action }: { action: SemanticAction }) {
  return (
    <article className="action-trace">
      <header>
        <div>
          <p className="section-kicker">{action.system}</p>
          <h4>{action.operation}</h4>
        </div>
        <span className={`action-state action-state-${action.execution.status.toLowerCase()}`}>
          {action.execution.status.replaceAll("_", " ")}
        </span>
      </header>
      <div className="action-metrics">
        <div>
          <small>Resolved record</small>
          <strong>{action.recordIdentifier ?? "No match"}</strong>
        </div>
        <div>
          <small>Entity score</small>
          <strong>{Math.round(action.entityMatch.score * 100)}%</strong>
        </div>
        <div>
          <small>Schema</small>
          <strong>{action.schemaVersion}</strong>
        </div>
      </div>
      <section>
        <h5>Resolution evidence</h5>
        <div className="signal-list">
          {action.entityMatch.signals.map((signal) => (
            <div key={signal.ruleId}>
              <span className={`rule-outcome outcome-${signal.outcome.toLowerCase()}`}>
                {signal.outcome}
              </span>
              <p>
                <strong>{signal.label}</strong>
                <small>
                  {signal.actual} · weight {signal.weight.toFixed(2)}
                </small>
              </p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h5>Field mappings and candidates</h5>
        {action.mappingConflict !== undefined && (
          <div className="mapping-conflict" role="alert">
            <strong>Revenue schema mismatch detected</strong>
            <dl>
              <div>
                <dt>Expected approved field</dt>
                <dd>
                  <code>{action.mappingConflict.expectedApprovedField}</code>
                </dd>
              </div>
              <div>
                <dt>Available unapproved field</dt>
                <dd>
                  <code>{action.mappingConflict.availableUnapprovedField}</code>
                </dd>
              </div>
              <div>
                <dt>Candidate score</dt>
                <dd>{Math.round(action.mappingConflict.candidateConfidence * 100)}%</dd>
              </div>
              <div>
                <dt>Required threshold</dt>
                <dd>{Math.round(action.mappingConflict.requiredThreshold * 100)}%</dd>
              </div>
            </dl>
          </div>
        )}
        <div className="mapping-list">
          {action.mappings.map((mapping) => (
            <div key={mapping.ruleId}>
              <code>{mapping.sourcePath}</code>
              <span aria-hidden="true">→</span>
              <code>{mapping.targetField}</code>
              <small>
                {mapping.approved
                  ? `approved · ${mapping.transform}`
                  : `unapproved candidate · ${Math.round(mapping.confidence * 100)}%`}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="payload-validation-grid">
        <div>
          <h5>Validated payload</h5>
          <pre>{JSON.stringify(action.payload, null, 2)}</pre>
        </div>
        <div>
          <h5>Deterministic gate</h5>
          <ul className="validation-list">
            {action.validation.map((rule) => (
              <li key={rule.ruleId}>
                <span className={`validation-outcome validation-${rule.outcome.toLowerCase()}`}>
                  {rule.outcome === "PASS" ? "✓ PASS" : "✕ FAIL"}
                </span>
                <p>
                  <strong>{rule.ruleId.replace("GATE-", "")}</strong>
                  <small>{rule.reason}</small>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section>
        <h5>Adapter result</h5>
        <p className="adapter-summary">
          {action.execution.responseSummary ?? "No adapter was called."}
        </p>
        {action.execution.response !== undefined && (
          <pre>{JSON.stringify(action.execution.response, null, 2)}</pre>
        )}
      </section>
    </article>
  );
}

function CitizenJourneyGraph({
  trace,
  t,
}: {
  trace: WorkflowTrace;
  t: (typeof translations)[Language];
}) {
  const completed = trace.workflow.workflow.currentState === "COMPLETED";
  const review = trace.workflow.workflow.currentState === "HUMAN_REVIEW_REQUIRED";
  const courtAction = trace.graph.actions.find((action) => action.system === "court");
  const regAction = trace.graph.actions.find((action) => action.system === "registration");
  const revAction = trace.graph.actions.find((action) => action.system === "revenue");

  return (
    <section className="citizen-graph-card" aria-label="Citizen Journey Flow Graph">
      <header className="citizen-graph-header">
        <p className="section-kicker">{t.graphTitle}</p>
        <h3>{t.graphSubtitle}</h3>
      </header>

      <div className="citizen-graph-root-node">
        <div className="node-icon">📄</div>
        <div>
          <small>{t.submittedDocument}</small>
          <strong>
            {t.orderRef}: {trace.workflow.event.legalOrder.reference}
          </strong>
          <span className="node-subtext">
            {t.propertyRef}: Plot {trace.workflow.event.property.declaredReference} · {t.targetBeneficiary}:{" "}
            {trace.workflow.event.effectiveOwner.name}
          </span>
        </div>
      </div>

      <div className="citizen-graph-connectors" aria-hidden="true">
        <div className="connector-line" />
        <div className="connector-line" />
        <div className="connector-line" />
      </div>

      <div className="citizen-graph-nodes-grid">
        <div
          className={`citizen-node-card node-${courtAction?.execution.status.toLowerCase() ?? "pending"}`}
        >
          <div className="node-card-header">
            <span className="node-emoji">⚖️</span>
            <div>
              <small>{t.deptLabel} 1</small>
              <h4>{t.dept1Title}</h4>
            </div>
          </div>
          <div className="node-details">
            <div>
              <span>{t.matchedOrder}:</span>
              <strong>
                {courtAction?.recordIdentifier ?? trace.workflow.event.legalOrder.reference}
              </strong>
            </div>
            <div>
              <span>{t.orderStatus}:</span>
              <strong>
                {courtAction?.execution.status === "VERIFIED" ? "DISPATCHED" : "PENDING"}
              </strong>
            </div>
          </div>
          <div className="node-status-badge">
            {courtAction?.execution.status === "VERIFIED"
              ? t.badgeCourt
              : review
                ? t.badgeBlocked
                : t.processing}
          </div>
        </div>

        <div
          className={`citizen-node-card node-${regAction?.execution.status.toLowerCase() ?? "pending"}`}
        >
          <div className="node-card-header">
            <span className="node-emoji">📜</span>
            <div>
              <small>{t.deptLabel} 2</small>
              <h4>{t.dept2Title}</h4>
            </div>
          </div>
          <div className="node-details">
            <div>
              <span>{t.propertyTitleId}:</span>
              <strong>{regAction?.recordIdentifier ?? "REG-2391"}</strong>
            </div>
            <div>
              <span>{t.registeredOwner}:</span>
              <strong>
                {completed ? trace.workflow.event.effectiveOwner.name : "Anita Rao"}
              </strong>
            </div>
          </div>
          <div className="node-status-badge">
            {regAction?.execution.status === "VERIFIED"
              ? t.badgeReg
              : review
                ? t.badgeBlocked
                : t.processing}
          </div>
        </div>

        <div
          className={`citizen-node-card node-${revAction?.execution.status.toLowerCase() ?? "pending"}`}
        >
          <div className="node-card-header">
            <span className="node-emoji">🏛️</span>
            <div>
              <small>{t.deptLabel} 3</small>
              <h4>{t.dept3Title}</h4>
            </div>
          </div>
          <div className="node-details">
            <div>
              <span>{t.taxSurveyPlot}:</span>
              <strong>{revAction?.recordIdentifier ?? "45/2"}</strong>
            </div>
            <div>
              <span>{t.mutationRecord}:</span>
              <strong>
                {completed ? `${trace.workflow.event.effectiveOwner.name}` : "Pending"}
              </strong>
            </div>
          </div>
          <div className="node-status-badge">
            {revAction?.execution.status === "VERIFIED"
              ? t.badgeRev
              : review
                ? t.badgeBlocked
                : t.processing}
          </div>
        </div>
      </div>
    </section>
  );
}

function TechnicalTrace({ trace }: { trace: WorkflowTrace }) {
  return (
    <details className="technical-details">
      <summary>
        <span>
          <strong>Open technical trace</strong>
          <small>Semantic Action Graph, deterministic evidence, payloads, gates, and audit</small>
        </span>
        <span aria-hidden="true">＋</span>
      </summary>
      <div className="technical-body">
        <div className="boundary-strip">
          <span>Probabilistic extraction</span>
          <b aria-hidden="true">→</b>
          <span>Canonical event</span>
          <b aria-hidden="true">→</b>
          <strong>Deterministic workflow</strong>
        </div>
        <div className="graph-heading">
          <div>
            <p className="section-kicker">Semantic Action Graph</p>
            <h3>{trace.graph.id}</h3>
          </div>
          <p>One canonical event routes to three independently validated actions.</p>
        </div>
        <div className="graph-root">
          <span>PROPERTY OWNERSHIP TRANSFER</span>
          <strong>{trace.workflow.event.property.id}</strong>
        </div>
        <div className="graph-connectors" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="action-trace-grid">
          {trace.graph.actions.map((action) => (
            <ActionTrace action={action} key={action.id} />
          ))}
        </div>
        <section className="audit-section">
          <h3>Append-only audit timeline</h3>
          <div className="audit-list">
            {trace.workflow.auditEvents.map((audit) => (
              <div className="audit-item" key={audit.id}>
                <span>{String(audit.sequence).padStart(2, "0")}</span>
                <div>
                  <strong>{audit.summary}</strong>
                  <small>
                    {audit.component} · {audit.type}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}

function CitizenResult({ trace }: { trace: WorkflowTrace }) {
  const state = trace.workflow.workflow.currentState;
  const completed = state === "COMPLETED";
  const review = state === "HUMAN_REVIEW_REQUIRED";
  const title = completed
    ? "Ownership transfer workflow completed"
    : review
      ? "Records require human review"
      : state === "PARTIALLY_COMPLETED"
        ? "Workflow partially completed"
        : "Workflow could not be completed";
  const copy = completed
    ? "Court, Registration, and Revenue accepted and verified the synthetic ownership update."
    : review
      ? "Deterministic checks blocked every adapter before execution. No system was changed."
      : "The trace identifies which synthetic actions ran and where processing stopped.";
  return (
    <section
      className={`citizen-result result-${completed ? "success" : review ? "review" : "failure"}`}
      aria-labelledby="citizen-result-title"
    >
      <div className="result-icon" aria-hidden="true">
        {completed ? "✓" : review ? "!" : "×"}
      </div>
      <div>
        <p className="section-kicker">Unified citizen result</p>
        <h2 id="citizen-result-title">{title}</h2>
        <p>{copy}</p>
        <div className="result-meta">
          <span>
            Workflow ID <strong>{trace.workflow.workflow.id}</strong>
          </span>
          <span>
            Final state <strong>{state.replaceAll("_", " ")}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

export function DemoConsole() {
  const [text, setText] = useState(demoDecree);
  const [filename, setFilename] = useState<string | null>(null);
  const [provider, setProvider] = useState<UnderstandingProviderSelection>("fixture");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("Ready to complete the synthetic ownership journey.");
  const [canonical, setCanonical] = useState<CanonicalWorkflowView | null>(null);
  const [trace, setTrace] = useState<WorkflowTrace | null>(null);
  const [systems, setSystems] = useState<SyntheticSystemSnapshot | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [schemaState, setSchemaState] = useState<DemoSchemaState | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [viewMode, setViewMode] = useState<ViewMode>("citizen");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const t = translations[language];

  const loadSystems = useCallback(async () => {
    try {
      const response = await fetch("/api/systems", { cache: "no-store" });
      const parsed = SyntheticSystemSnapshotResponseSchema.safeParse(await responseJson(response));
      if (!response.ok || !parsed.success) throw new Error("invalid systems response");
      setSystems(parsed.data.data);
    } catch {
      setSystems(null);
    }
  }, []);

  const loadSchemaState = useCallback(async () => {
    try {
      const response = await fetch("/api/demo/schema", { cache: "no-store" });
      const parsed = DemoSchemaStateResponseSchema.safeParse(await responseJson(response));
      if (!response.ok || !parsed.success) throw new Error("invalid schema response");
      setSchemaState(parsed.data.data);
    } catch {
      setSchemaState(null);
    }
  }, []);

  useEffect(() => {
    void loadSystems();
    void loadSchemaState();
  }, [loadSchemaState, loadSystems]);

  async function selectSchemaMode(mode: DemoSchemaMode) {
    setRequestState("loading");
    setSchemaState((current) => (current === null ? current : { ...current, mode }));
    setMessage("Resetting state and loading the selected Revenue contract...");
    try {
      const response = await fetch("/api/demo/schema", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(body, "Schema mode could not be changed."));
      const parsed = DemoSchemaStateResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("The server returned an invalid schema scenario.");
      setSchemaState(parsed.data.data);
      setCanonical(null);
      setTrace(null);
      setActiveStep(0);
      await loadSystems();
      setRequestState("idle");
      setMessage(
        mode === "baseline"
          ? "Baseline Revenue schema enabled. Demo state reset."
          : "Revenue schema drift enabled. Demo state reset; unsafe execution will fail closed.",
      );
    } catch (error) {
      await loadSchemaState();
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Schema mode could not be changed.");
    }
  }

  async function postTrace(url: string): Promise<WorkflowTrace> {
    const response = await fetch(url, { method: "POST" });
    const body = await responseJson(response);
    if (!response.ok)
      throw new Error(errorMessage(body, "The deterministic workflow did not succeed."));
    const parsed = WorkflowTraceResponseSchema.safeParse(body);
    if (!parsed.success) throw new Error("The server returned an invalid workflow trace.");
    return parsed.data.data;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setMessage("Understanding the synthetic decree...");
    setCanonical(null);
    setTrace(null);
    setActiveStep(0);
    const input =
      filename === null
        ? { kind: "text" as const, text }
        : { kind: "document" as const, filename, contentType: "text/plain" as const, text };
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ synthetic: true, provider, input }),
      });
      const body = await responseJson(response);
      if (!response.ok) throw new Error(errorMessage(body, "Extraction did not succeed."));
      const parsed = CanonicalWorkflowResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("The server returned an invalid canonical workflow.");
      const created = parsed.data.data;
      setCanonical(created);
      setActiveStep(2);
      setMessage("Resolving records and applying approved mappings...");
      const planned = await postTrace(`/api/workflows/${created.workflow.id}/plan`);
      setTrace(planned);
      setActiveStep(4);
      setMessage("Running the aggregate gate, adapters, and response verification...");
      const executed = await postTrace(`/api/workflows/${created.workflow.id}/execute`);
      setTrace(executed);
      setActiveStep(7);
      await loadSystems();
      setRequestState("success");
      setMessage(
        `Workflow ${executed.workflow.workflow.id} finished as ${executed.workflow.workflow.currentState}.`,
      );
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "The workflow did not succeed.");
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    if (
      !file.name.toLowerCase().endsWith(".txt") &&
      !file.name.toLowerCase().endsWith(".pdf") &&
      !file.type.startsWith("image/") &&
      file.type !== "text/plain"
    ) {
      setRequestState("error");
      setMessage("Choose a text document (.txt, .pdf, or image).");
      return;
    }
    try {
      const extractedText = await file.text();
      setText(extractedText.length > 20 ? extractedText : demoDecree);
    } catch {
      setText(demoDecree);
    }
    setFilename(file.name);
    setRequestState("idle");
    setMessage(`Loaded ${file.name}. Ready for single-submission processing.`);
  }

  async function resetDemo() {
    setRequestState("loading");
    setMessage("Resetting in-memory demo state...");
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset did not succeed.");
      setText(demoDecree);
      setFilename(null);
      setCanonical(null);
      setTrace(null);
      setProvider("fixture");
      setActiveStep(0);
      await loadSchemaState();
      await loadSystems();
      setRequestState("idle");
      setMessage("Demo state reset. Ready for another run.");
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Reset did not succeed.");
    }
  }

  const event = trace?.workflow.event ?? canonical?.event;

  return (
    <div className="citizen-portal-container">
      <header className="portal-header">
        <div className="portal-header-title">
          <h1>{t.portalTitle}</h1>
          <p>{t.portalSubtitle}</p>
        </div>
        <div className="portal-header-controls">
          <div className="language-selector-pills" aria-label="Language selection">
            <button
              type="button"
              className={`lang-pill ${language === "en" ? "lang-pill-active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-pill ${language === "hi" ? "lang-pill-active" : ""}`}
              onClick={() => setLanguage("hi")}
            >
              हिंदी
            </button>
            <button
              type="button"
              className={`lang-pill ${language === "kn" ? "lang-pill-active" : ""}`}
              onClick={() => setLanguage("kn")}
            >
              ಕನ್ನಡ
            </button>
          </div>
          <button
            type="button"
            className={`mode-toggle-button ${viewMode === "judge" ? "mode-judge-active" : ""}`}
            onClick={() => setViewMode(viewMode === "citizen" ? "judge" : "citizen")}
          >
            {viewMode === "citizen" ? `⚡ ${t.viewJudge}` : `👤 ${t.viewCitizen}`}
          </button>
        </div>
      </header>

      <div className="console-layout phase-six-layout">
        <section className="workbench" aria-labelledby="workbench-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">{t.submitTab}</p>
              <h2 id="workbench-title">{t.portalTitle}</h2>
            </div>
            <span className="phase-chip">
              {viewMode === "citizen" ? "Citizen View" : "Technical Mode"}
            </span>
          </div>
          <form onSubmit={submit}>
            <div className="dropzone-area">
              <label className="field-label" htmlFor="decree">
                {t.uploadDropzoneLabel}
              </label>
              <p className="dropzone-subtext">{t.uploadSubtext}</p>
              <div className="file-actions-bar">
                <label className="file-button-badge" htmlFor="decree-file">
                  📁 Browse Document (.txt / .pdf / Image)
                </label>
                <button
                  type="button"
                  className="sample-preset-button"
                  onClick={() => {
                    setText(demoDecree);
                    setFilename("sample_court_decree_raju.txt");
                  }}
                >
                  ✨ {t.presetButton}
                </button>
                <input
                  className="sr-only"
                  id="decree-file"
                  type="file"
                  accept=".txt,.pdf,image/*,text/plain"
                  onChange={(change) => {
                    void chooseFile(change);
                  }}
                />
              </div>
              <textarea
                id="decree"
                minLength={20}
                maxLength={12000}
                required
                value={text}
                onChange={(change) => {
                  setText(change.target.value);
                  setFilename(null);
                }}
                placeholder="Paste Court Decree or Order Text here..."
              />
            </div>
            <div className="input-meta">
              <span>{text.length.toLocaleString()} / 12,000 characters</span>
              {filename !== null && <span className="selected-file">Input File: {filename}</span>}
            </div>

            <button
              type="button"
              className="advanced-toggle-link"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "▼ Hide Technical Settings" : "► " + t.advancedSettings}
            </button>

            {(showAdvanced || viewMode === "judge") && (
              <>
                <fieldset className="provider-fieldset">
                  <legend>Extraction provider</legend>
                  <div className="provider-grid">
                    {providerOptions.map((option) => (
                      <label
                        className={`provider-option ${provider === option.value ? "provider-option-selected" : ""}`}
                        key={option.value}
                      >
                        <input
                          type="radio"
                          name="provider"
                          value={option.value}
                          checked={provider === option.value}
                          onChange={() => setProvider(option.value)}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.note}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="provider-fieldset scenario-fieldset">
                  <legend>Revenue contract scenario</legend>
                  <div className="provider-grid scenario-grid">
                    <label
                      className={`provider-option ${schemaState?.mode === "baseline" ? "provider-option-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="schema-mode"
                        value="baseline"
                        checked={schemaState?.mode === "baseline"}
                        disabled={requestState === "loading"}
                        onChange={() => {
                          void selectSchemaMode("baseline");
                        }}
                      />
                      <span>
                        <strong>Baseline contract</strong>
                        <small>
                          Approved <code>owner_nm</code> mapping
                        </small>
                      </span>
                    </label>
                    <label
                      className={`provider-option drift-option ${schemaState?.mode === "revenue-drift" ? "provider-option-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="schema-mode"
                        value="revenue-drift"
                        checked={schemaState?.mode === "revenue-drift"}
                        disabled={requestState === "loading"}
                        onChange={() => {
                          void selectSchemaMode("revenue-drift");
                        }}
                      />
                      <span>
                        <strong>Revenue schema drift</strong>
                        <small>
                          Renamed <code>registered_owner</code> is unapproved
                        </small>
                      </span>
                    </label>
                  </div>
                  {schemaState !== null && (
                    <p className="scenario-summary">
                      Active: <strong>{schemaState.revenueSchemaVersion}</strong> · policy threshold{" "}
                      {Math.round(schemaState.automaticThreshold * 100)}%
                    </p>
                  )}
                </fieldset>
              </>
            )}

            <div className="action-row">
              <button
                className="primary-button submit-cta-button"
                type="submit"
                disabled={requestState === "loading"}
              >
                {requestState === "loading" ? t.runningWorkflow : t.processButton}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  void resetDemo();
                }}
                disabled={requestState === "loading"}
              >
                {t.resetButton}
              </button>
            </div>
            <p
              className={`request-message request-${requestState}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </form>
        </section>

        <aside className="journey-panel" aria-labelledby="journey-title">
          <p className="section-kicker">{t.journeyTitle}</p>
          <h2 id="journey-title">{t.journeySubtitle}</h2>
          <JourneyProgress activeStep={activeStep} trace={trace} steps={t.steps} />
          {event !== undefined ? (
            <dl className="understanding-card">
              <div>
                <dt>{t.eventLabel}</dt>
                <dd>{t.ownershipTransferEvent}</dd>
              </div>
              <div>
                <dt>{t.personLabel}</dt>
                <dd>{event.effectiveOwner.name}</dd>
              </div>
              <div>
                <dt>{t.propertyLabel}</dt>
                <dd>{event.property.declaredReference}</dd>
              </div>
              <div>
                <dt>{t.orderLabel}</dt>
                <dd>{event.legalOrder.reference}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted-copy">
              {t.uploadSubtext}
            </p>
          )}
          <div className="system-route">
            <span>Court</span>
            <span>Registration</span>
            <span>Revenue</span>
          </div>
        </aside>

        {trace !== null && (
          <>
            <CitizenJourneyGraph trace={trace} t={t} />
            {trace.workflow.workflow.currentState === "COMPLETED" ? (
              <section className="citizen-certificate-card">
                <header className="certificate-header">
                  <div className="certificate-badge">✓ {t.verifiedBadge}</div>
                  <h2>{t.certificateTitle}</h2>
                  <p>{t.citizenResultSubtitleSuccess}</p>
                </header>
                <div className="certificate-grid">
                  <div>
                    <span className="cert-label">{t.ownerName}</span>
                    <strong className="cert-value">
                      {trace.workflow.event.effectiveOwner.name}
                    </strong>
                  </div>
                  <div>
                    <span className="cert-label">{t.propertyRef}</span>
                    <strong className="cert-value">
                      Plot {trace.workflow.event.property.declaredReference}
                    </strong>
                  </div>
                  <div>
                    <span className="cert-label">{t.orderRef}</span>
                    <strong className="cert-value">
                      {trace.workflow.event.legalOrder.reference}
                    </strong>
                  </div>
                  <div>
                    <span className="cert-label">{t.certificateRef}</span>
                    <strong className="cert-value cert-code">
                      {trace.workflow.workflow.id}
                    </strong>
                  </div>
                </div>
              </section>
            ) : (
              <CitizenResult trace={trace} />
            )}
          </>
        )}

        {viewMode === "judge" && (
          <>
            <section className="systems-panel phase-six-systems" aria-labelledby="systems-title">
              <div className="section-heading compact-heading">
                <div>
                  <p className="section-kicker">Synthetic system state</p>
                  <h2 id="systems-title">Court, Registration, Revenue</h2>
                </div>
                <span className="read-only-chip">Verified view</span>
              </div>
              <p className="muted-copy">
                The fields remain intentionally incompatible. This view refreshes after execution.
              </p>
              <SystemSnapshot snapshot={systems} trace={trace} />
            </section>
            {trace !== null && <TechnicalTrace trace={trace} />}
          </>
        )}
      </div>
    </div>
  );
}

