# ADR-009: MSW for the in-app mock backend, Prism as the standalone mock server, Vitest + Testing Library + ajv for contract/UI tests

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** FE-APP
- **Gate:** G-DEP
- **Originating packet:** W1-APP-1

## Context
W1-APP-1 needs the frontend to run against a fake-but-realistic backend with zero
real server, per kyndro-sprint-plan.md Sprint 1 ("Stand up Prism mock server from
OpenAPI v1 + MSW handlers seeded with fixtures"). No human was available to approve
G-DEP synchronously during this autonomous build session (2026-07-03); per this
run's ADR-and-proceed convention, this ADR is PROPOSED and the tooling is used
immediately. Note: ADR-008 was already claimed by W1-SYS-1 on its own unmerged
branch (`w1/fe-sys-tokens-components`) — this packet uses ADR-009 to avoid a
number collision once both branches are reviewed; a human/ORCH should renumber
if the merge order differs.

## Decision
We will use **MSW** (`msw`, browser + node builds) as the in-app mock layer: the
same request handlers run in the dev app (via a service worker) and in tests (via
`msw/node`), so "flipping mock→live" is only ever a base-URL/flag change, never a
second implementation. We will use **Prism** (`@stoplight/prism-cli`, invoked via a
documented `pnpm` script, not installed as a project dependency) as the standalone
mock server for tooling outside the app (contract exploration, curl-driven manual
checks) — it does not power the dashboard itself. For verification we use
**Vitest** + **@testing-library/react** + **jsdom** (render screens against the
same MSW handlers and assert on fixture-derived output, loading/empty/error
states) and **ajv** + **@apidevtools/swagger-parser** (dereference
`contract/openapi.yaml` and validate every mocked response against its schema —
this is the "contract test" that fails the build on drift).

## Alternatives considered
- **json-server** — rejected: schema-unaware, would require hand-maintaining a
  second data shape instead of reading `/contract/openapi.yaml` + `/fixtures/`
  directly; exactly the kind of drift the packet's acceptance criteria rule out.
- **Cypress component tests instead of Vitest + Testing Library** — rejected for
  W1: heavier setup/runtime cost for a minimal two-screen packet; revisit via a
  new ADR if e2e coverage becomes a real need in a later wave.
- **Hand-rolled fetch mock (e.g. monkey-patching `global.fetch`)** — rejected:
  reimplements what MSW already does correctly (request matching, passthrough,
  per-scenario overrides) and would diverge between dev and test environments.

## Consequences
Easier: one mock implementation (MSW handlers) serves both `npm run dev` and the
test suite; contract drift is caught by a fast, dependency-light ajv check rather
than a running server. Harder: MSW's browser build needs a one-time
`msw init public/` step (service-worker registration file) — done as part of this
packet, documented in `/app/README.md`. New dev-only dependencies: `msw`,
`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `ajv`,
`@apidevtools/swagger-parser`. `@stoplight/prism-cli` is invoked via `pnpm dlx`,
not added to `package.json`, so it carries no install cost until someone runs the
script. No paid service, no runtime cost in production (MSW/Prism are dev-only).
