"use client";

import {
  ApiErrorResponseSchema,
  CanonicalWorkflowResponseSchema,
  SyntheticSystemSnapshotResponseSchema,
  type CanonicalWorkflowView,
  type SyntheticSystemSnapshot,
  type UnderstandingProviderSelection,
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
}: {
  name: string;
  fields: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <article className="system-card">
      <div className="system-card-heading">
        <h3>{name}</h3>
        <span>Seeded</span>
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

function SystemSnapshot({ snapshot }: { snapshot: SyntheticSystemSnapshot | null }) {
  if (snapshot === null)
    return <p className="muted-copy">Loading the three synthetic records...</p>;
  return (
    <div className="system-grid">
      <SystemCard
        name="Court"
        fields={[
          ["order_ref", snapshot.court.order_ref],
          ["property_ref", snapshot.court.property_ref],
          ["beneficiary", snapshot.court.beneficiary],
        ]}
      />
      <SystemCard
        name="Registration"
        fields={[
          ["property_id", snapshot.registration.property_id],
          ["buyer_name", snapshot.registration.buyer_name],
          ["instrument_type", snapshot.registration.instrument_type],
        ]}
      />
      <SystemCard
        name="Revenue"
        fields={[
          ["survey_no", snapshot.revenue.survey_no],
          ["owner_nm", snapshot.revenue.owner_nm],
          ["mutation_required", String(snapshot.revenue.mutation_required)],
        ]}
      />
    </div>
  );
}

function WorkflowResult({ view }: { view: CanonicalWorkflowView }) {
  const { event, workflow, auditEvents } = view;
  return (
    <section className="result-panel" aria-labelledby="result-title">
      <div className="result-heading">
        <div>
          <p className="section-kicker">Canonical result</p>
          <h2 id="result-title">Understanding complete</h2>
        </div>
        <span className="state-chip">{workflow.currentState.replaceAll("_", " ")}</span>
      </div>
      <dl className="entity-grid">
        <div>
          <dt>Event</dt>
          <dd>Property ownership transfer</dd>
        </div>
        <div>
          <dt>New owner</dt>
          <dd>{event.effectiveOwner.name}</dd>
        </div>
        <div>
          <dt>Property reference</dt>
          <dd>{event.property.declaredReference ?? "Not supplied"}</dd>
        </div>
        <div>
          <dt>Survey number</dt>
          <dd>{event.property.surveyNumber ?? "Not supplied"}</dd>
        </div>
        <div>
          <dt>Legal order</dt>
          <dd>{event.legalOrder.reference}</dd>
        </div>
        <div>
          <dt>Workflow</dt>
          <dd>{workflow.id}</dd>
        </div>
      </dl>
      <div className="boundary-notice">
        <strong>Understanding only.</strong>
        <span>No departmental record is changed in Phase 3.</span>
      </div>
      <div className="trace-grid">
        <div>
          <p className="section-kicker">Interpretation</p>
          <p className="trace-value">
            {event.interpretation.provider} / {event.interpretation.model}
          </p>
          <p className="trace-note">Prompt {event.interpretation.promptVersion}</p>
        </div>
        <div>
          <p className="section-kicker">Evidence captured</p>
          <p className="trace-value">{event.evidence.length} source references</p>
          <p className="trace-note">Canonical output was runtime validated.</p>
        </div>
      </div>
      <div className="audit-list" aria-label="Workflow audit timeline">
        {auditEvents.map((audit) => (
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
      <details className="raw-details">
        <summary>Inspect raw canonical JSON</summary>
        <pre>{JSON.stringify(view, null, 2)}</pre>
      </details>
    </section>
  );
}

export function DemoConsole() {
  const [text, setText] = useState(demoDecree);
  const [filename, setFilename] = useState<string | null>(null);
  const [provider, setProvider] = useState<UnderstandingProviderSelection>("fixture");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("Ready to extract a canonical event.");
  const [workflow, setWorkflow] = useState<CanonicalWorkflowView | null>(null);
  const [systems, setSystems] = useState<SyntheticSystemSnapshot | null>(null);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("loading");
    setMessage(
      provider === "fixture"
        ? "Running deterministic extraction..."
        : "Contacting the configured model...",
    );
    setWorkflow(null);
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
      setWorkflow(parsed.data.data);
      setRequestState("success");
      setMessage(`Created ${parsed.data.data.workflow.id}. No mock-system updates were called.`);
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Extraction did not succeed.");
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
      setWorkflow(null);
      setProvider("fixture");
      await loadSystems();
      setRequestState("idle");
      setMessage("Demo state reset. Ready for another run.");
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Reset did not succeed.");
    }
  }

  return (
    <div className="console-layout">
      <section className="workbench" aria-labelledby="workbench-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Interactive test console</p>
            <h2 id="workbench-title">Test the understanding pipeline</h2>
          </div>
          <span className="phase-chip">Phase 3</span>
        </div>
        <div className="boundary-notice console-boundary">
          <strong>Understanding only.</strong>
          <span>No departmental record is changed while you test this screen.</span>
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
            onChange={(event) => {
              setText(event.target.value);
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
              onChange={(event) => {
                void chooseFile(event);
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
              {requestState === "loading" ? "Working..." : "Extract canonical event"}
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
      <section className="systems-panel" aria-labelledby="systems-title">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-kicker">Read-only evidence</p>
            <h2 id="systems-title">Inspect seeded system records</h2>
          </div>
          <span className="read-only-chip">No mutations</span>
        </div>
        <p className="muted-copy">
          The same property uses incompatible identifiers and field names. Resolution and mapping
          arrive in Phase 4.
        </p>
        <SystemSnapshot snapshot={systems} />
      </section>
      {workflow !== null && <WorkflowResult view={workflow} />}
    </div>
  );
}
