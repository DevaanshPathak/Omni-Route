import { getApiHealth } from "../lib/api";

export const dynamic = "force-dynamic";

const boundarySteps = [
  { eyebrow: "Probabilistic", title: "LLM proposes", detail: "Structured extraction only" },
  { eyebrow: "Canonical", title: "Meaning stabilizes", detail: "Department-neutral contract" },
  { eyebrow: "Deterministic", title: "Systems decide", detail: "Validate before execution" },
] as const;

export default async function Home() {
  const api = await getApiHealth();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f3ea] text-[#13231d]">
      <div aria-hidden="true" className="page-glow" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#173e31]/15 pb-5">
          <a className="brand-mark" href="#top" aria-label="Omni-Route home">
            <span>OMNI</span>
            <span className="text-[#df5d32]">/</span>
            <span>ROUTE</span>
          </a>
          <span className="rounded-full border border-[#173e31]/15 bg-white/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#345448]">
            Phase 0 · Foundation
          </span>
        </header>

        <section
          id="top"
          className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.12fr_0.88fr] lg:py-24"
        >
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-[#b84625]">
              Semantic interoperability
            </p>
            <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-8xl">
              One event.
              <span className="mt-2 block font-serif italic text-[#1d684d]">
                One validated route.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#486057] sm:text-xl">
              The citizen describes what happened once. Omni-Route will translate that meaning into
              safe actions across disconnected government systems.
            </p>

            <div className="mt-10 flex flex-wrap gap-3" aria-label="Scaffold capabilities">
              {["Next.js interface", "Express API", "Shared runtime contract", "Docker ready"].map(
                (capability) => (
                  <span className="capability-pill" key={capability}>
                    <span aria-hidden="true">✓</span> {capability}
                  </span>
                ),
              )}
            </div>
          </div>

          <aside className="status-panel" aria-labelledby="foundation-title">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="panel-label">Live foundation check</p>
                <h2
                  id="foundation-title"
                  className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
                >
                  Web → API
                </h2>
              </div>
              <span aria-hidden="true" className={`status-orb ${api.ok ? "status-orb-ok" : ""}`} />
            </div>

            <div
              className={`mt-8 rounded-2xl border p-5 ${
                api.ok ? "border-[#1d684d]/25 bg-[#e8f2ec]" : "border-[#b84625]/25 bg-[#fff0e9]"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.16em]">
                {api.ok ? "API connected" : "API unavailable"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#52665e]">
                {api.ok
                  ? `${api.health.service} · v${api.health.version}`
                  : "Start the API service, then refresh this page."}
              </p>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[#6d7c76]">Runtime state</dt>
                <dd className="mt-1 font-semibold">In memory</dd>
              </div>
              <div>
                <dt className="text-[#6d7c76]">External systems</dt>
                <dd className="mt-1 font-semibold">Synthetic only</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section
          className="mb-6 border-y border-[#173e31]/15 py-6"
          aria-labelledby="boundary-title"
        >
          <h2 id="boundary-title" className="sr-only">
            Omni-Route safety boundary
          </h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {boundarySteps.map((step, index) => (
              <li className="boundary-step" key={step.title}>
                <span className="step-number">0{index + 1}</span>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#b84625]">
                    {step.eyebrow}
                  </p>
                  <p className="mt-1 font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm text-[#65756f]">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
