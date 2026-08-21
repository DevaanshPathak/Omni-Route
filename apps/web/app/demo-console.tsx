"use client";

import {
  ApiErrorResponseSchema,
  CanonicalWorkflowResponseSchema,
  SyntheticSystemSnapshotResponseSchema,
  WorkflowTraceResponseSchema,
  type CanonicalWorkflowView,
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
}: {
  activeStep: number;
  trace: WorkflowTrace | null;
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
      {journeySteps.map((step, index) => {
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
        <h5>Approved field mappings</h5>
        <div className="mapping-list">
          {action.mappings.map((mapping) => (
            <div key={mapping.ruleId}>
              <code>{mapping.sourcePath}</code>
              <span aria-hidden="true">→</span>
              <code>{mapping.targetField}</code>
              <small>{mapping.transform}</small>
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
  useEffect(() => {
    void loadSystems();
  }, [loadSystems]);

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
      !file.name.toLowerCase().endsWith(".txt") ||
      (file.type !== "" && file.type !== "text/plain")
    ) {
      setRequestState("error");
      setMessage("Choose a UTF-8 plain-text .txt document.");
      return;
    }
    setText(await file.text());
    setFilename(file.name);
    setRequestState("idle");
    setMessage(`Loaded ${file.name}. The file stays in this browser until submission.`);
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
    <div className="console-layout phase-six-layout">
      <section className="workbench" aria-labelledby="workbench-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">One citizen submission</p>
            <h2 id="workbench-title">Complete the ownership journey</h2>
          </div>
          <span className="phase-chip">Phase 6</span>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="decree">
            Synthetic court decree
          </label>
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
          />
          <div className="input-meta">
            <span>{text.length.toLocaleString()} / 12,000 characters</span>
            <label className="file-button" htmlFor="decree-file">
              Load .txt file
            </label>
            <input
              className="sr-only"
              id="decree-file"
              type="file"
              accept=".txt,text/plain"
              onChange={(change) => {
                void chooseFile(change);
              }}
            />
          </div>
          {filename !== null && <p className="selected-file">Document input: {filename}</p>}
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
          <div className="action-row">
            <button className="primary-button" type="submit" disabled={requestState === "loading"}>
              {requestState === "loading" ? "Workflow running..." : "Complete ownership workflow"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                void resetDemo();
              }}
              disabled={requestState === "loading"}
            >
              Reset demo
            </button>
          </div>
          <p className={`request-message request-${requestState}`} role="status" aria-live="polite">
            {message}
          </p>
        </form>
      </section>

      <aside className="journey-panel" aria-labelledby="journey-title">
        <p className="section-kicker">Citizen journey</p>
        <h2 id="journey-title">One event, seven controlled stages</h2>
        <JourneyProgress activeStep={activeStep} trace={trace} />
        {event !== undefined ? (
          <dl className="understanding-card">
            <div>
              <dt>Event</dt>
              <dd>Ownership transfer</dd>
            </div>
            <div>
              <dt>Person</dt>
              <dd>{event.effectiveOwner.name}</dd>
            </div>
            <div>
              <dt>Property</dt>
              <dd>{event.property.declaredReference}</dd>
            </div>
            <div>
              <dt>Order</dt>
              <dd>{event.legalOrder.reference}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted-copy">
            Submit the decree to see the canonical event and deterministic route.
          </p>
        )}
        <div className="system-route">
          <span>Court</span>
          <span>Registration</span>
          <span>Revenue</span>
        </div>
      </aside>

      {trace !== null && <CitizenResult trace={trace} />}
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
    </div>
  );
}
