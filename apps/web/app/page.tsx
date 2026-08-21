import { getApiHealth } from "../lib/api";
import { DemoConsole } from "./demo-console";

export const dynamic = "force-dynamic";

export default async function Home() {
  const api = await getApiHealth();

  return (
    <main>
      <div aria-hidden="true" className="page-glow" />
      <div className="page-shell">
        <header className="topbar">
          <a className="brand-mark" href="#top" aria-label="Omni-Route home">
            <span>OMNI</span>
            <span className="brand-slash">/</span>
            <span>ROUTE</span>
          </a>
          <div
            className={`api-status ${api.ok ? "api-status-ok" : "api-status-error"}`}
            role="status"
          >
            <span aria-hidden="true" />
            {api.ok ? `API connected · ${api.health.service}` : "API unavailable"}
          </div>
        </header>
        <section className="hero" id="top">
          <div>
            <p className="hero-kicker">Semantic interoperability · Local MVP console</p>
            <h1>
              One event. <em>One verified outcome.</em>
            </h1>
            <p className="hero-copy">
              Submit a synthetic property decree once. Omni-Route resolves three incompatible
              records, validates every action, executes the safe workflow, and returns one result.
            </p>
          </div>
          <aside className="scope-card">
            <p className="section-kicker">Available now</p>
            <strong>Phases 0–7</strong>
            <ul>
              <li>Three synthetic system APIs</li>
              <li>Canonical runtime + audit</li>
              <li>Structured AI extraction</li>
              <li>Deterministic resolve + map</li>
              <li>Validated execution + audit</li>
              <li>Safe Revenue schema-drift demo</li>
            </ul>
            <p>
              <b>Current:</b> repeatable happy and fail-closed paths with an inspectable trace.
            </p>
          </aside>
        </section>
        <DemoConsole />
        <footer className="safety-footer">
          <strong>LLM proposes.</strong>
          <span>Canonical contracts constrain.</span>
          <span>Deterministic systems validate and execute.</span>
        </footer>
      </div>
    </main>
  );
}
