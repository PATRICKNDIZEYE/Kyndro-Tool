# Kyndro — 6-Month Development Plan
**12 sprints × 2 weeks · Dual-track (Backend + Frontend running concurrently) · v0 to Public Beta**

Target: kyndro.app public beta + open-source CLI release at the end of Sprint 12.

---

## 1. The concurrency doctrine (how nobody ever waits)

The whole plan is built so the frontend team never blocks on the backend team, and vice versa. Four rules make that true:

**Rule 1 — Contract-first, always.** Before any feature sprint starts, its API surface is written down as an OpenAPI schema plus webhook/event schemas. The contract is the deliverable that unblocks both teams simultaneously: backend implements *against* it, frontend builds *on top of* it. No backend endpoint merges without the contract updated; no frontend screen is designed against an imaginary API.

**Rule 2 — Mocks are first-class.** In Sprint 1 the frontend stands up a mock server auto-generated from the OpenAPI spec (Prism) plus MSW for in-browser mocking, seeded with a **golden fixture library** — realistic sample runs, verdicts, counterexamples, and spec candidates published by backend in week 1. From that moment the frontend has "a backend" forever, even for features that won't exist for three months.

**Rule 3 — Feature flags decouple shipping.** Frontend ships screens dark against mocks; when the real endpoint lands, the flag flips from mock to live. Swapping is a config change, not a rewrite.

**Rule 4 — Contract tests police the seam.** Pact-style contract tests run in CI on both sides. If backend drifts from the schema, backend's build breaks. If frontend assumes something not in the schema, frontend's build breaks. Integration bugs get caught by robots, not by one team waiting on the other.

**Rituals:** Wednesday 30-min integration checkpoint (only topic: the contract seam). Friday end-of-sprint demo — always demoed through the real UI, with mocked portions labeled on screen. Shared `@kyndro/types` package generated from the OpenAPI spec so both codebases import identical types.

---

## 2. Team shape (assumed 4 engineers + founder; scale up/down per column)

| Role                         | Focus                                                                |
| ---------------------------- | -------------------------------------------------------------------- |
| BE-1 (PL/compilers-leaning)  | Tree-sitter/IR, spec DSL, PBT engine, SMT                            |
| BE-2 (platform/infra)        | GitHub App, queue, sandbox runners, caching, multi-tenancy           |
| FE-1 (product)               | Dashboard app, verdict/spec review flows, onboarding                 |
| FE-2 (design systems + docs) | Component library, marketing site, docs, CLI output UX               |
| Founder                      | PM, design direction, design-partner recruiting, DSL taste decisions |

If you only have 2 engineers, run the same plan with one per track and stretch each sprint's scope ~1.5x; the parallel structure holds.

---

## 3. The sprint map

### SPRINT 1 — Foundations & the first contract (Weeks 1–2)
**Sprint goal:** Both teams can build and deploy independently, against a frozen v1 contract.

**Backend**
- Monorepo, CI/CD, dev/staging environments, error tracking + tracing from day one.
- Architecture spike: tree-sitter → typed IR proof-of-concept on TypeScript (parse, walk, print function inventory).
- Author **OpenAPI v1**: auth, `/repos`, `/runs`, `/runs/:id`, `/runs/:id/obligations`, `/specs`, webhook event schema (`run.started`, `run.updated`, `run.completed`).
- Publish the golden fixture library (sample analyzed PR, obligations in all 3 verdict states, one counterexample, 10 candidate specs).
- GitHub OAuth app registration + token model design.

**Frontend**
- Design tokens + component library seed: typography, colors, buttons, tables, status chips (VERIFIED / FALSIFIED / UNKNOWN), monospace code block, diff viewer shell.
- Wireframes: dashboard home, run detail, spec review inbox, onboarding.
- Stand up Prism mock server from OpenAPI v1 + MSW handlers seeded with fixtures.
- Marketing landing page skeleton on kyndro.app (waitlist capture live by end of sprint).

**Integration point / demo:** Landing page live; FE renders fixture data through the mock server; contract v1 frozen and tagged.

**Definition of done:** `npm run dev` on FE shows a fake-but-realistic dashboard with zero backend running.

---

### SPRINT 2 — Ingestion & app shell (Weeks 3–4)
**Sprint goal:** A real PR event flows into our system; a real user can log in.

**Backend**
- GitHub App: install flow, webhook receiver (PR opened / synchronize / reopened), signature verification.
- Repo checkout service (shallow clone at head + base SHAs), diff extraction.
- Job queue + worker skeleton (Postgres-backed queue is fine at this stage), run lifecycle state machine.
- Real implementation of auth + `/repos` endpoints (first mock → live flip).

**Frontend**
- App shell: GitHub OAuth login flow, navigation, org/repo switcher.
- Onboarding flow: "Install the GitHub App → pick repos → first run" (against mocks for run creation).
- Empty states and loading skeletons for every screen designed so far.
- Docs site scaffold (framework + IA, first page: "How Kyndro works").

**Integration point / demo:** Log in with real GitHub, install the app on a test repo, open a PR, watch a run record appear (status: `queued` — analysis comes next sprint). First mock→live flag flips.

---

### SPRINT 3 — Semantic diff engine v1 (Weeks 5–6)
**Sprint goal:** Kyndro understands *what changed* in a PR, not just which lines.

**Backend**
- TypeScript AST diffing: function-level change detection, semantic no-op filtering (renames, formatting).
- Call graph construction for TS; **blast radius v1** (direct callers of changed functions inherit obligations).
- Persist analysis results; implement `/runs/:id` + `/runs/:id/obligations` for real; emit `run.updated` events over websocket/SSE.
- Analysis worker containerized with resource limits (this container later becomes the PBT sandbox).

**Frontend**
- Run history page + run detail v1: changed-function list, blast-radius view (changed → affected callers), semantic diff viewer.
- Live status via websocket/SSE against the mock event stream; flip to real events when BE lands them.
- Marketing site: "How it works" section with pipeline visual.

**Integration point / demo:** Open a PR touching 3 functions → dashboard shows the 3 changes plus 2 blast-radius callers, live-updating. Second mock→live flip (runs + events).

---

### SPRINT 4 — Spec DSL & storage (Weeks 7–8)
**Sprint goal:** Specs exist as a real, versioned artifact in the customer's repo.

**Backend**
- Spec DSL v1: grammar + parser (preconditions, postconditions, invariants, round-trip properties), helpful parse errors.
- `.kyndro/specs/` conventions: read/write, spec↔function binding resolution, orphan detection.
- Spec validation API + candidate-spec data model (provenance field: `mined | static | proposed`, confidence score).
- Contract v2 authored for Sprints 5–6 surface (verification results, counterexample shape, regression-test payload) so FE is unblocked for the next two sprints.

**Frontend**
- Spec review UI v1: candidate inbox, confirm / reject / edit with DSL syntax highlighting, provenance + confidence badges.
- DSL playground page (paste spec → parse feedback) — doubles as internal debugging tool and future docs demo.
- Docs: DSL reference v1 written alongside the grammar (FE-2 pairs with BE-1 for accuracy).

**Integration point / demo:** Confirm a candidate spec in the UI → it's committed to `.kyndro/specs/` in the repo via a Kyndro-authored commit → re-run picks it up.

---

### SPRINT 5 — Property-based testing engine core (Weeks 9–10)
**Sprint goal:** Kyndro executes code against specs and produces its first verdicts.

**Backend**
- Property harness compiler: spec → executable property test (TypeScript first).
- Input generators: primitives, strings, arrays, object shapes derived from TS types; seedable + reproducible runs.
- Execution sandbox: isolated container per run, CPU/memory/time limits, no network.
- Obligation results wired end-to-end: `VERIFIED (bounded) / FALSIFIED / UNKNOWN` persisted and emitted.

**Frontend**
- Verdict page v1: obligation list grouped by function, status chips, per-obligation detail drawer, raw execution log view.
- Run summary header (counts by verdict, duration, cache stats placeholder).
- Notification preferences screen (against mocks; delivery lands Sprint 10).

**Integration point / demo (internal milestone):** Seed a deliberate bug in a test repo → open PR → dashboard shows **FALSIFIED** with the failing property. First real verdict ever produced.

---

### SPRINT 6 — Shrinking, counterexamples & the GitHub Check (Weeks 11–12)
**Sprint goal:** *The product moment.* End-to-end MVP: PR in, witness out, merge blocked.

**Backend**
- Shrinking: minimize failing inputs to their simplest form; deterministic replay of any counterexample.
- Counterexample serialization + **regression-test emitter** (generates a committable test file reproducing the failure).
- GitHub Checks integration: required status check, verdict summary, inline annotations on the offending lines.
- Hardening pass on the queue/sandbox (retries, poison-job handling, idempotent webhooks).

**Frontend**
- Counterexample viewer: minimal failing input rendered structurally, replay command copy button, **one-click "Commit regression test"** flow (opens a suggested commit on the PR).
- GitHub Check content design (the check summary is UI too — treat it like a screen).
- Polish sprint on states: errors, partial runs, permission failures.

**Integration point / demo — 🏁 MILESTONE M1 (end of Month 3): THE MVP DEMO.** Agent-authored PR with a contract-violating call site → Kyndro posts a failing required check → dashboard shows the shrunken counterexample → one click commits the regression test. Record this demo; it's your seed-round video.

---

### SPRINT 7 — Dynamic spec mining (Weeks 13–14)
**Sprint goal:** Kyndro drafts specs by watching the customer's own test suite.

**Backend**
- Test-suite instrumentation for TS (Jest/Vitest runners): trace capture at function boundaries.
- Daikon-style invariant detection over traces (ranges, nullability, length relations, ordering, purity hints) with confidence scoring.
- Candidate-spec pipeline: dedupe, rank, cap per function; miner runs as an onboarding job and nightly.
- Contract v3 authored (mining endpoints, analytics shapes for Sprint 8).

**Frontend**
- "Suggested specs" inbox v2: confidence-sorted, bulk confirm/reject, keyboard-driven triage (this screen is where users live — invest here).
- Onboarding step: "Run the miner on your test suite" with progress + results reveal (the aha moment of setup).
- Dashboard analytics stub against mocks: specs confirmed over time, obligations per run.

**Integration point / demo:** Fresh repo onboarded → miner proposes 25 candidate specs from the existing test suite → 10 confirmed in under two minutes via bulk triage.

---

### SPRINT 8 — LLM proposal layer + Python support (Weeks 15–16)
**Sprint goal:** Richer specs than mining can find; second language live.

**Backend**
- LLM spec-proposal service with the house rule enforced in code: **every proposal is validated against recorded traces/static checks before it may surface** (propose → check → only then show).
- Python front-end: tree-sitter grammar → IR, Hypothesis-backed property harness, pytest instrumentation for the miner.
- Per-language capability matrix exposed via API (which tiers run where).

**Frontend**
- Spec provenance UX: mined vs static vs proposed clearly distinguished; "why was this proposed" explainer per spec.
- Language badges + per-repo language settings; capability matrix rendered in docs automatically from the API.
- Analytics v1 live: catch rate (falsified obligations caught pre-merge), review-time proxy metrics.

**Integration point / demo:** A Python repo and a TS repo run side by side; an LLM-proposed round-trip property catches a bug mining couldn't express.

---

### SPRINT 9 — CLI & the local loop (Weeks 17–18)
**Sprint goal:** Developers get verdicts in their terminal before CI ever runs; alpha begins.

**Backend**
- `kyndro` CLI (Rust or Go): `init`, `run` (local engine on working tree), `specs list|confirm`, auth token flow; shares the analysis engine with CI.
- Local result cache; `--changed-only` mode targeting sub-60s local runs on medium repos.
- Design-partner tenancy: invite flow, per-org rate limits, usage telemetry (privacy-respecting).

**Frontend**
- CLI output design owned by FE-2 (colors, tables, verdict rendering, `--json` mode) — terminal UX is product UX.
- Docs: quickstart (App + CLI paths), CI recipes (GitHub Actions), DSL reference complete.
- In-app "Install the CLI" onboarding card; empty-state upgrade prompts.

**Integration point / demo — 🏁 MILESTONE M2: CLOSED ALPHA.** 3–5 design partners onboarded live. Weekly feedback loop starts (founder owns it).

---

### SPRINT 10 — Performance, caching & teams (Weeks 19–20)
**Sprint goal:** Fast enough that nobody disables us; ready for more than one team per org.

**Backend**
- Content-addressed result cache keyed on `(function_hash, spec_hash)`; incremental verification (only changed + blast radius re-verified).
- Parallel obligation execution; target **p95 CI wall-clock \< 8 minutes** on alpha repos.
- Multi-tenancy hardening: org isolation review, rate limiting, audit log v1.
- Notification delivery: Slack webhook + email on FALSIFIED.

**Frontend**
- Performance panel: cache hit rate, run duration trends, slowest obligations.
- Org & team management: members, roles (admin/member), repo access.
- Alpha feedback triage burn-down (both tracks reserve ~30% capacity this sprint for partner-reported issues).

**Integration point / demo:** Same PR run twice — second run completes in seconds via cache. Slack message fires on a falsified verdict.

---

### SPRINT 11 — SMT alpha ("Proved" tier) + hardening (Weeks 21–22)
**Sprint goal:** First mathematical proofs ship behind a labs flag; the platform is trustworthy enough to charge for.

**Backend**
- Z3 integration for a pure, side-effect-free TS-strict subset: IR → SMT-LIB encoding, portfolio runner (3–4 solver configs in parallel, first answer wins), hard 30s/obligation timeout.
- `UNSAT` surfaced as **PROVED** with explicit bounds; graceful `UNKNOWN` fallback to Tier 1 confidence.
- Security review: secrets handling, sandbox escape review, dependency audit, data retention policy.
- Billing plumbing (Stripe): plans, metering by active repo.

**Frontend**
- "Proved" badge treatment — visually distinct from bounded verification, with an honest bounds-disclosure popover (this honesty is brand).
- Labs settings page (opt-in per repo); billing & plan screens.
- Marketing site final: pricing page, security page, comparison page (probabilistic review vs deterministic gate).

**Integration point / demo:** A pure function's postcondition returns PROVED with the bound displayed; an out-of-scope function gracefully reports UNKNOWN → Tier 1 result. First test charge processed in Stripe test mode.

---

### SPRINT 12 — Launch (Weeks 23–24)
**Sprint goal:** Public beta + open-source release. 🏁 MILESTONE M3.

**Backend**
- Load test to 10x alpha traffic; on-call runbooks; backup/restore drill.
- OSS extraction: CLI + core engine repo (license chosen — Apache-2.0 core / commercial cloud is the standard PLG wedge), contribution guide, issue templates.
- Bug bash (whole team, 2 days) + fix window.

**Frontend**
- Launch polish: onboarding friction pass (target: install → first verdict \< 10 minutes), empty-state delight, a11y pass.
- Docs complete + versioned; demo video assets; GitHub Marketplace listing; launch blog post ("Why LLM review isn't verification").
- Public status page.

**Launch checklist:** OSS repo public → Marketplace listing live → blog + demo video → design partners quoted → waitlist emailed.

---

## 4. Milestones at a glance

| Milestone                  | When                        | Proof point                                                         |
| -------------------------- | --------------------------- | ------------------------------------------------------------------- |
| **M1 — MVP**               | End of Sprint 6 (Month 3)   | PR blocked by a shrunken counterexample + one-click regression test |
| **M2 — Closed alpha**      | End of Sprint 9 (Month 4.5) | 3–5 design partners running Kyndro on real repos, CLI in daily use  |
| **M3 — Public beta + OSS** | End of Sprint 12 (Month 6)  | Anyone can install; engine core open-sourced; billing live          |

## 5. What's allowed to slip (pre-decided, so nobody panics)

1. **SMT tier (Sprint 11)** → can ship post-beta as "labs" without harming launch. Tier 1 + counterexamples IS the sellable product.
2. **Python miner depth** → Python PBT must ship; deep mining parity with TS can trail by a sprint.
3. **Notifications & analytics polish** → nice-to-have before beta, mandatory after.

**Not allowed to slip:** the contract-first rule, the Sprint 6 MVP demo, sandbox security, and p95 \< 8 min. These are the product.

## 6. Risk register (top 5)

| Risk                                                      | Likelihood | Mitigation                                                                                                        |
| --------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Spec review feels like homework → users churn             | High       | Sprint 7's bulk-triage UX is a first-class product bet; measure time-to-10-confirmed-specs weekly                 |
| CI latency \> 8 min → devs disable the gate               | Medium     | Caching + incremental verification prioritized in Sprint 10 before beta, not after                                |
| TS type-level edge cases explode harness compiler scope   | Medium     | Explicit v1 capability matrix; UNKNOWN is an acceptable, honest verdict                                           |
| Solo-track staffing (illness/hire gap) breaks parallelism | Medium     | Contract + fixtures mean either track can idle a week without blocking the other — that's the doctrine paying off |
| An incumbent ships "deterministic gate" marketing         | Low-Med    | Speed to M1 demo + OSS wedge; their static analysis ≠ your executable specs, say so publicly                      |

## 7. Working agreements (print this)

- The contract is the meeting. Change the schema → both leads sign off same day.
- Demo through the UI every Friday, even for backend features. If it can't be demoed, it isn't done.
- Every FALSIFIED in our own dogfooding gets a screenshot in the team channel. Celebrate witnesses.
- Kyndro runs on Kyndro from Sprint 6 onward. We are design partner zero.

