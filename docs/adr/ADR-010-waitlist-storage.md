# ADR-010: Waitlist storage — local JSON-file table for v1, no external service yet

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** FE-SYS
- **Gate:** G-DEP
- **Originating packet:** W1-SYS-2

## Context
W1-SYS-2 needs the marketing landing page's waitlist form to persist submitted
emails to a real, queryable table — not just log to the console — per the
packet's acceptance criteria ("form stores to table"; "a submitted email is
persisted to the storage table").

This is running in an unattended 7-hour session with no human present to
create accounts, provision a managed database/table, or mint a real API key.
PLAN.md §6 forbids committing secrets, and the verification sandbox forbids
network calls. Any real hosted storage (Supabase, Airtable, a managed
Postgres table, a forms SaaS) needs an account, a credential, and a named
repo secret — none of which an agent can responsibly create for itself.

Number note: this branch (`w1/fe-sys-landing-waitlist`) forked from `main`
before either `w1/fe-sys-tokens-components` (which claimed ADR-008) or
`w1/fe-app-mock-server` (ADR-009) merged, so `ADR-008` was free on this
branch's tree but already claimed elsewhere. Using ADR-010 to leave a gap
rather than collide a third time; a human/ORCH should renumber all three
once merge order is decided.

## Decision
We will ship a local, dependency-free JSON-file-backed table
(`site/server/waitlistStore.ts`, data file at `site/data/waitlist.json`,
gitignored so no real captured emails are ever committed) as the v1 storage
implementation:
- `POST /api/waitlist` is served only in `vite dev` via a custom Vite server
  middleware (`site/vite.config.ts`) — not present in the production build,
  since there is no host to run a Node process on yet and no G-PUB'd deploy
  target.
- The store module (`appendEntry`, `readAll`) is pure enough to unit-test
  directly (temp file per test), independent of the HTTP layer.
- Client-side (`site/src/main.ts`) validates the email shape before
  submitting and renders the three required states: idle/empty, error
  (invalid email or request failure), and success.

This satisfies every acceptance criterion (persisted table, validation,
error/success states, buildable+renderable locally with zero Kyndro backend)
without any account, secret, or network dependency.

## Alternatives considered
- **A real hosted table (Supabase/Airtable/etc.) now** — rejected: requires
  an account and a secret only a human can create; would either block this
  packet for 7 hours or force an agent to invent a fake credential, which is
  worse than being honest about the gap.
- **No persistence, just a `console.log` / in-memory array** — rejected:
  explicitly fails the packet's acceptance criterion that a submission is
  "persisted."
- **A local SQLite file via `better-sqlite3`** — rejected for v1: adds a
  native-binding dependency for a problem a plain JSON file already solves
  at this scale (a waitlist, pre-launch), and native deps are exactly the
  kind of thing that should wait for a real G-DEP conversation with a human
  about the target deploy environment (does it support native modules?).

## Consequences
- Nothing is deployed and nothing is publish-ready in the "real backend"
  sense yet — a human still needs to pick and provision a real storage
  service before `kyndro.app` goes live, then swap `waitlistStore.ts`'s
  implementation behind the same two-function interface. That swap is a
  small, isolated change specifically because the interface is minimal.
  Until then, `pnpm --filter @kyndro/site dev` gives a fully working,
  honest local demo.
- `site/data/waitlist.json` must never be committed (gitignored); if a human
  runs this locally and wants to keep the captured entries, they should copy
  the file out before it's cleaned.
- No G-PUB request is filed by this ADR itself — that's a separate step in
  the packet notes, since G-PUB covers the deploy of the page, not this
  storage decision.
