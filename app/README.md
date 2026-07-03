# @kyndro/app

Minimal dashboard (run list → run detail) built against the Kyndro API contract,
backed entirely by a mock layer — no live backend exists yet (that's later
packets under `/platform`).

## Mocking

- `mock/handlers.ts` implements all 8 contract operations using MSW, seeded from
  the golden fixtures in `/fixtures` (falls back to locally-synthesized data for
  `/auth/*`, which has no fixture — see `docs/adr/ADR-009-mock-tooling.md`).
- `mock/browser.ts` wires the same handlers into a Service Worker for `pnpm dev`.
- `mock/node.ts` wires them into `setupServer` for tests (`tests/setup.ts`).
- List endpoints accept `?scenario=empty|unauthorized` to reach empty/error UI
  states without a one-off handler; tests that need full control use
  `server.use(...)` overrides directly (see `tests/ui/*.test.tsx`).
- A standalone Prism mock server (contract-only, no fixtures) is also available
  via `pnpm mock:prism` for exploring the raw contract.

## Commands

- `pnpm dev` — Vite dev server with the MSW browser worker enabled.
- `pnpm build` — typecheck + production build.
- `pnpm test` — Vitest (UI + contract tests).
- `pnpm test:contract` — just the contract-conformance tests, which dereference
  `contract/openapi.yaml` and validate every mocked response against its schema
  with ajv.

## Not yet built

- Live API mode (`VITE_API_MODE=live`) has the flag seam (`flags/index.ts`) but
  no implementation — there is no backend to point it at yet.
- Real diffs: `@kyndro/design-system`'s `DiffViewerShell` is intentionally
  unused here. Counterexamples are rendered as text via `CodeBlock` instead of
  fabricating diff lines the contract doesn't provide.
