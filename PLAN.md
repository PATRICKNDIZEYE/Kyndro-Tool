# Kyndro — Agentic Build Plan
**Executed by Claude Fable 5 agents · Orchestrated as a multi-agent team · Humans in the loop at every gate that matters**

This document replaces the human-sprint plan with an agent-executable one. Drop it in the repo root as `PLAN.md`. Agents read it; humans govern it.

---

## 0. How to run this document

Three supported run modes — same roster, same packets, pick per your setup:

1. **Claude Code Agent Teams (recommended).** One lead session (ORCH) spawns teammates; each teammate runs in its own context window and communicates through the shared task list. Experimental — enable via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings. Docs: code.claude.com/docs/en/agent-teams
2. **Single session + subagents.** ORCH runs as the main Claude Code session and delegates packets to subagents. Remember: a subagent receives ONLY its delegation prompt plus CLAUDE.md — every packet prompt must be self-contained (file paths, decisions already made, acceptance criteria all inside the prompt).
3. **Managed Agents API.** A coordinator agent with a declared roster (each agent gets its own model, system prompt, and tool scope) for headless/CI-driven execution. Docs: platform.claude.com/docs/en/managed-agents/multi-agent

**Model assignment:** default every agent to `claude-fable-5`. Cost lever if needed: mechanical scaffolding packets (boilerplate screens, fixture generation) can run on `claude-sonnet-4-6` without quality risk; keep ORCH, BE-CORE, and QA-CRITIC on Fable 5 always — those are the judgment seats.

---

## 1. Operating principles (read before anything else)

**P1 — The repo is the memory.** Agents have no shared brain and no durable memory between sessions. All coordination happens through committed artifacts: this plan, `/tasks/`, `/contract/`, `/docs/adr/`, `/fixtures/`. If a decision isn't written to the repo, it didn't happen.

**P2 — Humans are the bottleneck; design for review bandwidth, not build speed.** Fable 5 agents will produce code far faster than the original two-week sprint cadence assumed. The constraint that survives is human attention. Therefore: waves replace sprints (a wave ends when its exit gate is passed, not when a calendar says so), every PR stays under ~400 changed lines so a human can actually read it, and ORCH batches decisions into one daily digest instead of interrupting humans per-question.

**P3 — Guardrails are mechanisms, not prompts.** Prompt instructions are advisory; agents can drift. Anything that must never happen is enforced by machinery: branch protection (agents cannot merge to `main` — only humans can), tool permission scoping per agent, deterministic hooks that always fire (lint, secret scan, contract test) regardless of what the model intended, and CI as the final arbiter.

**P4 — Sequential contract, parallel build.** The one documented pattern that makes multi-agent work collision-free: the shared contract (OpenAPI schema, event schemas, types) is written FIRST, alone, by one agent, and frozen by a human gate. Only then does the team fan out. Nobody builds against an unwritten interface.

**P5 — Territory, never shared files.** Each agent owns directories, not files-within-shared-directories. Two agents editing one file is a merge conflict factory and the #1 multi-agent failure mode. The territory map in §3 is law.

**P6 — Generate, then criticize, then human.** Every PR passes through QA-CRITIC (an adversarial reviewer agent that never writes code) before it reaches a human. Humans review pre-filtered, annotated PRs — their time goes to judgment, not typo-hunting.

**P7 — Two strikes, then stop.** An agent that fails the same packet twice must halt, write a blocker report to `/tasks/blocked/`, and escalate. Retrying a third time on a polluted context almost never works; a fresh context with a better-scoped prompt does. No infinite loops, no thrashing.

---

## 2. Agent roster — charters (paste-ready spawn prompts)

Seven agents. Each charter below is written to be pasted directly as the teammate/subagent spawn prompt (or the agent `system` field in the Managed Agents API). Do not soften the NEVER lines.

### ORCH — Orchestrator / team lead
```
You are ORCH, the orchestrator for the Kyndro build. You do not write product code.
MISSION: read PLAN.md, open the current wave, decompose packets into tasks in /tasks/,
assign each task to the owning agent per the territory map (§3), track state, and
compile the daily human review digest (§5 format) into /digests/YYYY-MM-DD.md.
YOU OWN: /tasks/, /digests/, PLAN.md checkboxes.
NEVER: write application code; merge anything; change /contract/ yourself; assign two
agents to the same directory; let a task skip QA-CRITIC review.
ESCALATE TO HUMAN when: a packet's acceptance criteria are ambiguous, two agents need
the same file, a wave exit gate is reached, or any agent files a blocker report.
Each delegation prompt you write must be fully self-contained: include file paths,
relevant ADR decisions, the packet's acceptance criteria verbatim, and the branch name.
```

### BE-CORE — Verification engine (PL/compilers seat)
```
You are BE-CORE, the language-engine builder for Kyndro.
MISSION: tree-sitter frontends, the typed IR, semantic diffing, the spec DSL
(grammar/parser), the property-based testing harness compiler, shrinking, and later
the SMT encoding.
YOU OWN: /engine/ (parser, ir, diff, dsl, pbt, smt), /engine/tests/.
NEVER: touch /platform/, /app/, /site/; add a dependency without an ADR + human gate
G-DEP; weaken a failing test to make it pass; mark UNKNOWN results as VERIFIED.
QUALITY BAR: every module ships with golden tests; every parser ships with error-message
tests (bad input must produce a helpful message, that is product surface).
On two failed attempts at a task: stop, write /tasks/blocked/<id>.md, escalate.
```

### BE-PLAT — Platform & infrastructure
```
You are BE-PLAT, the platform builder for Kyndro.
MISSION: GitHub App + webhooks, auth, job queue and run lifecycle, execution sandbox,
caching, notifications, billing plumbing, deploy configs.
YOU OWN: /platform/, /infra/, /platform/tests/.
NEVER: touch /engine/ or /app/; store a secret in code or fixtures; open the sandbox
network; implement an endpoint that differs from /contract/openapi.yaml (if the
contract is wrong, file a contract-change request task instead); self-approve
security-sensitive paths (§6 list) — those PRs are human-gated no matter what.
Webhook signature verification, token handling, and sandbox isolation are G-SEC gated:
your PR description must include a threat-model paragraph.
```

### FE-APP — Product frontend
```
You are FE-APP, the dashboard builder for Kyndro.
MISSION: the web app — onboarding, run history, run detail, spec review inbox,
verdict and counterexample views, org/team settings.
YOU OWN: /app/ (except /app/design-system/), /app/tests/.
BUILD AGAINST: the mock server generated from /contract/openapi.yaml, seeded with
/fixtures/. Every screen ships behind a feature flag defaulting to mock; flipping
mock→live is a config change, never a rewrite.
NEVER: invent an API shape not in the contract; hardcode fixture data inside
components; touch /engine/ or /platform/; ship a screen without loading, empty, and
error states (QA-CRITIC will reject it).
```

### FE-SYS — Design system, docs, marketing, CLI UX
```
You are FE-SYS, the surfaces builder for Kyndro.
MISSION: the component library and design tokens, the docs site, the marketing site,
and the CLI's output design (tables, colors, verdict rendering, --json mode).
YOU OWN: /app/design-system/, /site/, /docs-site/, /cli/ux/.
NEVER: introduce a second styling approach; publish or deploy anything public (G-PUB
is human-only); write docs that describe unshipped behavior as shipped.
DOCS RULE: every DSL or CLI feature lands with its docs page in the same wave, written
from the merged code, not from the packet description.
```

### QA-CRITIC — Adversarial reviewer (never writes code)
```
You are QA-CRITIC, the adversarial reviewer for Kyndro. You never write or edit
product code. You read, run, and attack.
MISSION: for every PR, verify the packet's acceptance criteria one by one; run the
test suite and the linters; attempt to break the change (edge inputs, empty states,
concurrent webhooks, malformed specs); check territory compliance (§3) and PR size
(<400 lines); then post a structured review: PASS / FAIL per criterion + risks.
YOU OWN: /reviews/.
NEVER: rubber-stamp; fix code yourself (report, don't repair); pass a PR whose tests
you did not actually execute.
Your review is the human's briefing. A lazy review wastes the scarcest resource we
have: human attention.
```

### SEC-REV — Security reviewer (triggered, not resident)
```
You are SEC-REV, spawned only for PRs touching the G-SEC path list (§6).
MISSION: review for injection, authz gaps, secret exposure, sandbox escape, SSRF in
webhook/fetch paths, and dependency risk. Produce a findings report in /reviews/sec/.
NEVER: approve. You produce findings; a human closes the gate.
```

---
## 3. Territory map (collision law)

| Path                                                       | Owner                                                                       | Others may                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------- |
| `/contract/` (OpenAPI, event schemas, generated types)     | Written by BE-PLAT **only via contract-change tasks**, frozen by human gate | Everyone reads; nobody else writes       |
| `/engine/`                                                 | BE-CORE                                                                     | read                                     |
| `/platform/`, `/infra/`                                    | BE-PLAT                                                                     | read                                     |
| `/app/` (minus design-system)                              | FE-APP                                                                      | read                                     |
| `/app/design-system/`, `/site/`, `/docs-site/`, `/cli/ux/` | FE-SYS                                                                      | read                                     |
| `/cli/` (engine glue)                                      | BE-CORE                                                                     | FE-SYS owns output formatting only       |
| `/fixtures/`                                               | BE-PLAT publishes, versioned                                                | Everyone reads                           |
| `/tasks/`, `/digests/`                                     | ORCH                                                                        | agents update their own task file status |
| `/reviews/`                                                | QA-CRITIC, SEC-REV                                                          | read                                     |
| `/docs/adr/`                                               | Any agent may PROPOSE an ADR                                                | Humans accept                            |

Rule of thumb from the field: **one agent = one directory tree = one branch = one PR.** If a packet seems to require touching two territories, it is two packets with a contract between them — ORCH must split it.

## 4. Coordination protocol

### 4.1 Task packet schema
Every unit of work is a YAML file in `/tasks/`. Packets are the ONLY way work is assigned.

```yaml
id: W3-BE-CORE-2
wave: W3
agent: BE-CORE
title: Blast radius v1 — direct callers inherit obligations
branch: w3/be-core-blast-radius
depends_on: [W3-BE-CORE-1]        # ORCH enforces; blocked tasks are not spawned
context:                           # self-contained briefing — subagents see ONLY this
  - "Call graph builder lives in /engine/graph/ (see W3-BE-CORE-1 result)"
  - "ADR-007 chose function-level granularity; do not do statement-level"
  - "Obligation model: /contract/openapi.yaml#/components/schemas/Obligation"
deliverables:
  - /engine/blast/radius.ts
  - /engine/tests/blast/*.test.ts
acceptance:                        # machine-checkable, verbatim, no vibes
  - "pnpm test engine/blast passes; coverage of radius.ts >= 90%"
  - "Golden case: fixture repo 'shop' — changing applyDiscount yields obligations
     for applyDiscount AND checkout, nothing else"
  - "Renaming a local variable yields zero obligations (semantic no-op test)"
human_gate: none                   # or G-SEC / G-CONTRACT / G-UX / G-PUB / G-DEP
max_attempts: 2
status: todo                       # todo -> claimed -> in_review -> human_gate -> done
```

### 4.2 Lifecycle
`todo → claimed (agent writes its name) → PR opened → in_review (QA-CRITIC) → human_gate (only if flagged, or if QA-CRITIC raises a risk) → human merges → done`. Agents never merge — branch protection enforces this, not politeness.

### 4.3 Deterministic hooks (guaranteed, zero-trust of prompts)
Configure as Claude Code hooks + CI so they fire regardless of agent intent:
- **PreToolUse on Bash:** block `git push --force`, `rm -rf`, network calls from sandbox test runs.
- **PostToolUse on Edit/Write:** run linter + secret scanner on touched files.
- **CI required checks:** contract tests (both directions), full test suite, PR-size check (\>400 lines fails with "split this packet"), territory check (diff paths ⊆ owner's territory).

### 4.4 Failure protocol
Attempt 1 fails → agent reads QA-CRITIC's review, fixes on the same branch. Attempt 2 fails → STOP. Write `/tasks/blocked/<id>.md` containing: what was tried, exact failing criterion, hypothesis, and a proposed re-scope. ORCH puts it in the digest; a human (or ORCH with fresh context and a rewritten packet) reassigns. Never a third blind attempt.

## 5. Human-in-the-loop gate matrix

Humans: **H-PO** (product owner — you) decides product, UX, publishing, money. **H-TL** (tech lead — you again until hired) decides architecture, security, dependencies. One person may hold both seats; the gates still exist.

| Gate           | Fires when                                                       | Human decides                                          | SLA              |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ---------------- |
| **G-CONTRACT** | Any change to `/contract/`                                       | Approve schema change (both build tracks depend on it) | same day         |
| **G-SEC**      | PR touches §6 sensitive paths, or SEC-REV finding                | Accept threat model, merge                             | 24h              |
| **G-UX**       | First implementation of any user-facing flow (per flow, once)    | Approve look/flow from screenshots + running preview   | 24h              |
| **G-DSL**      | Spec DSL grammar decisions                                       | Taste call — the DSL is the product's soul             | 48h              |
| **G-DEP**      | New dependency, new service, anything that costs money           | Approve ADR                                            | 24h              |
| **G-PUB**      | Anything public: deploys, Marketplace, OSS release, emails, blog | Ship/no-ship                                           | explicit         |
| **G-WAVE**     | Wave exit                                                        | Run the demo script, read the digest, open next wave   | blocks next wave |

**Daily digest (ORCH compiles, human reads in \<10 min):** merged since yesterday (one line each) · PRs awaiting human gate with QA-CRITIC verdicts · blocked tasks + proposed re-scopes · decisions needed (max 5, each with a recommended option) · burn: packets done/total for the wave.

## 6. Hard guardrails

**NEVER (enforced by mechanism):** merge to `main` (branch protection: humans only) · deploy/publish (G-PUB) · touch secrets/`.env`/keys (hook-blocked + scanner) · disable or skip a failing test · edit another agent's territory (CI territory check) · exceed 400 changed lines per PR (CI) · make network calls from the verification sandbox (egress-off container).

**ALWAYS ASK (agent must halt and file for a gate):** contract shape changes · new dependencies or services · anything ambiguous in acceptance criteria · schema migrations · GitHub App permission scope changes · pricing/billing logic.

**G-SEC path list:** `/platform/auth/**`, `/platform/webhooks/**` (signature verification), `/platform/sandbox/**`, `/infra/**`, `/platform/billing/**`, token/secret handling anywhere.

---

## 7. Wave plan (W1–W12)

Waves preserve the sprint plan's dependency order but are **gated by review, not by calendar**. A wave with Fable 5 agents may complete in days; do not let that tempt anyone to skip a gate. Packet tables are compact — ORCH expands each row into a full YAML packet (§4.1) when opening the wave, copying acceptance criteria verbatim from `kyndro-sprint-plan.md` where more detail exists.

### W1 — Foundations & the frozen contract
*Entry: repo initialized, branch protection ON, hooks installed, this file merged.*
**Sequential first (P4):** `W1-PLAT-1` BE-PLAT authors `/contract/openapi.yaml` v1 + event schemas + `/fixtures/` golden set → **G-CONTRACT** freeze.
Then parallel:
| ID | Agent | Deliverable | Acceptance (machine) | Gate |
|---|---|---|---|---|
| W1-PLAT-2 | BE-PLAT | CI/CD, envs, telemetry, hook config | pipeline green on empty app; hooks fire on a seeded violation | G-SEC |
| W1-CORE-1 | BE-CORE | tree-sitter→IR spike (TS) | parses fixture repo; prints function inventory; 20 golden tests | — |
| W1-SYS-1 | FE-SYS | tokens + component seed (chips, code block, diff shell) | Storybook builds; a11y lint clean | G-UX |
| W1-SYS-2 | FE-SYS | landing page + waitlist | Lighthouse ≥ 90; form stores to table | G-PUB |
| W1-APP-1 | FE-APP | mock server from contract + MSW handlers | all fixture endpoints served; contract tests pass | — |
*Exit G-WAVE-1: human runs `demos/w1.md` — mock dashboard renders fixtures with zero backend.*

### W2 — Ingestion & shell
| ID | Agent | Deliverable | Acceptance | Gate |
|---|---|---|---|---|
| W2-PLAT-1 | BE-PLAT | GitHub App: install + webhooks + signature verify | replayed fixture webhook accepted; tampered signature rejected (test) | G-SEC |
| W2-PLAT-2 | BE-PLAT | checkout service + queue + run state machine | PR event → run row `queued`; poison job dead-letters | — |
| W2-PLAT-3 | BE-PLAT | real auth + `/repos` (first mock→live flip) | contract tests green against live | G-SEC |
| W2-APP-1 | FE-APP | app shell, OAuth flow, repo onboarding | e2e: login→install→see repo (Playwright) | G-UX |
| W2-SYS-1 | FE-SYS | docs scaffold + "How Kyndro works" | builds; nav works | — |
*Exit: live login, real PR creates a queued run.*

### W3 — Semantic diff v1
| W3-CORE-1 | BE-CORE | AST diff + semantic no-op filter | rename/format fixtures → 0 obligations; logic-change fixtures → exact expected set |
| W3-CORE-2 | BE-CORE | call graph + blast radius v1 | golden 'shop' case (see §4.1 example) |
| W3-PLAT-1 | BE-PLAT | persist analysis; `/runs` live; SSE events | contract tests; event replay test |
| W3-APP-1 | FE-APP | run history + detail + blast view (mock→live flip) | e2e on fixtures; live flip behind flag | G-UX |
*Exit: PR touching 3 fns shows 3 changes + 2 blast callers, live-updating.*

### W4 — Spec DSL & storage
| W4-CORE-1 | BE-CORE | DSL grammar + parser + error messages | 60 golden parses; 20 bad-input msgs snapshot-tested | **G-DSL** |
| W4-CORE-2 | BE-CORE | `.kyndro/specs/` read/write + binding | orphan detection test; roundtrip test |
| W4-PLAT-1 | BE-PLAT | candidate-spec model + validation API; author contract v2 (verification shapes) | contract tests | G-CONTRACT |
| W4-APP-1 | FE-APP | spec review inbox v1 (confirm/reject/edit) | e2e triage flow on fixtures | G-UX |
| W4-SYS-1 | FE-SYS | DSL playground + DSL docs v1 | docs examples all parse (CI-checked) |
*Exit: confirm a spec in UI → committed to repo → re-run binds it.*

### W5 — PBT engine core
| W5-CORE-1 | BE-CORE | spec→property harness compiler (TS) | 30 spec fixtures compile+run |
| W5-CORE-2 | BE-CORE | generators (primitives, arrays, object shapes from types); seeded runs | reproducibility test: same seed = same result |
| W5-PLAT-1 | BE-PLAT | sandbox executor (no net, CPU/mem/time caps) | escape attempts in test suite all fail | G-SEC |
| W5-APP-1 | FE-APP | verdict page v1 (obligations, chips, logs) | e2e all three verdict states from fixtures | G-UX |
*Exit (internal): seeded bug → first real FALSIFIED.*

### W6 — Shrinking, counterexamples, GitHub Check  🏁 M1
| W6-CORE-1 | BE-CORE | shrinking + deterministic replay | shrunken inputs ≤ documented size on 20 fixture bugs |
| W6-CORE-2 | BE-CORE | regression-test emitter | emitted file runs red pre-fix, green post-fix (both CI-verified) |
| W6-PLAT-1 | BE-PLAT | GitHub Checks: required check + annotations | check blocks merge on FALSIFIED in dogfood repo |
| W6-APP-1 | FE-APP | counterexample viewer + one-click commit test | e2e full loop | G-UX |
*Exit G-WAVE-6 = **MVP demo, human-run, recorded**. From here Kyndro runs on Kyndro (dogfood repo mandatory).*

### W7 — Dynamic spec mining
W7-CORE-1 instrumentation (Jest/Vitest) + trace capture · W7-CORE-2 invariant detection + confidence (precision measured on fixture suite ≥ agreed bar) · W7-PLAT-1 mining jobs + contract v3 (G-CONTRACT) · W7-APP-1 suggestions inbox v2 with bulk triage (G-UX; metric: 10 specs confirmed \<2 min in usability run) · W7-SYS-1 onboarding "run the miner" flow.
*Exit: fresh fixture repo → ≥20 sane candidates → bulk-confirm works.*

### W8 — LLM proposal layer + Python
W8-CORE-1 propose→check pipeline (**house rule in code**: no unvalidated proposal surfaces; adversarial tests prove it) · W8-CORE-2 Python frontend + Hypothesis harness + pytest instrumentation · W8-APP-1 provenance UX + language settings · W8-SYS-1 capability matrix docs auto-generated from API.
*Exit: TS + Python repos side by side; a proposed round-trip property catches a planted bug mining missed.*

### W9 — CLI & local loop  🏁 M2
W9-CORE-1 `kyndro` CLI (init/run/specs, local cache, `--changed-only` \<60s on medium fixture repo) · W9-SYS-1 CLI output UX + `--json` (snapshot-tested) · W9-PLAT-1 design-partner tenancy + rate limits · W9-SYS-2 quickstart + CI recipes docs.
*Exit G-WAVE-9 = closed alpha: H-PO onboards 3–5 partners LIVE (humans do this, not agents). Feedback intake: partners' reports become packets tagged `alpha-fb`.*

### W10 — Performance, caching, teams
W10-PLAT-1 content-addressed cache `(function_hash, spec_hash)` + incremental verification (**p95 \< 8 min** measured on alpha repos — hard acceptance) · W10-PLAT-2 org isolation review + audit log (G-SEC) · W10-PLAT-3 Slack/email on FALSIFIED · W10-APP-1 perf panel + org/roles UI.
*Reserve ~30% of wave capacity for `alpha-fb` packets.*

### W11 — SMT alpha + hardening
W11-CORE-1 Z3 encoding for pure TS-strict subset; portfolio runner; 30s/obligation cap; UNSAT surfaces as PROVED **with bounds string** (honesty is acceptance criteria) · W11-CORE-2 graceful UNKNOWN fallback · W11-PLAT-1 Stripe plumbing (G-SEC + G-DEP) · W11-APP-1 Proved badge + bounds disclosure + billing screens (G-UX) · SEC-REV full-platform pass → findings burned down (G-SEC).
*Exit: pure fn returns PROVED with bound; out-of-scope fn degrades honestly; test charge succeeds.*

### W12 — Launch  🏁 M3
W12-PLAT-1 load test 10x + runbooks + backup drill · W12-CORE-1 OSS extraction of CLI+engine (license = human decision, G-PUB) · W12-SYS-1 docs complete + Marketplace listing + launch post (all G-PUB) · W12-ALL bug bash: every agent attacks another agent's territory for 2 days, findings → packets.
*Exit G-WAVE-12: H-PO ships. Agents never press the publish button.*

---

## 8. What humans actually do all day (so this stays honest)

Read one digest (≈10 min). Approve/reject gated PRs from QA-CRITIC briefings. Make the ≤5 queued decisions. Run wave-exit demos personally. Talk to design partners — agents never represent Kyndro to a human customer. Watch three health metrics ORCH maintains in the digest: blocked-task count (rising = packets are underspecified, fix the packets not the agents), average PR human-review latency (you are the bottleneck — protect it), and dogfood FALSIFIED catches (celebrate every witness in public).

## 9. Seed files checklist (create before opening W1)

`PLAN.md` (this file) · `CLAUDE.md` (10 lines max: territory table pointer, packet workflow pointer, the seven NEVERs) · `/tasks/` with W1 packets expanded · branch protection ON · hooks configured · empty `/contract/`, `/fixtures/`, `/reviews/`, `/digests/`, `/docs/adr/ADR-000-template.md`.

*Final note: when a packet fails twice, the instinct will be to blame the agent. It is almost always the packet. Rewrite the briefing, shrink the scope, restate the acceptance criteria as tests — then respawn fresh.*

