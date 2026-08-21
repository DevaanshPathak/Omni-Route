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
              From decree to <em>canonical meaning.</em>
            </h1>
            <p className="hero-copy">
              Paste a synthetic property decree, run fixture or live structured extraction, and
              inspect the canonical workflow created before any deterministic execution is allowed.
            </p>
          </div>
          <aside className="scope-card">
            <p className="section-kicker">Available now</p>
            <strong>Phases 0–3</strong>
            <ul>
              <li>Three synthetic system APIs</li>
              <li>Canonical runtime + audit</li>
              <li>Structured AI extraction</li>
            </ul>
            <p>
              <b>Next:</b> deterministic entity resolution and semantic mapping.
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
