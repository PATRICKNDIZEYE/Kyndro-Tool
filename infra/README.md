# /infra — CI, hooks, environments (BE-PLAT territory)

## CI (`ci/`)
- `pipeline.yml` — GitHub Actions workflow (ADR-011): contract-tests,
  test-suite, pr-size-check, territory-check. Matches the four
  `required_status_checks` contexts HUMAN-SETUP.md §2 wires into branch
  protection.
- `scripts/check-pr-size.mjs` — fails a diff over 400 changed lines
  (PLAN.md §6). Run locally: `node infra/ci/scripts/check-pr-size.mjs
  origin/main`.
- `scripts/check-territory.mjs` + `scripts/territory-map.mjs` — fails a diff
  that touches files outside the branch's owning agent's territory
  (PLAN.md §3). Run locally: `node infra/ci/scripts/check-territory.mjs
  origin/main`.
- `tests/` — vitest suite covering both scripts plus the hooks below, with
  seeded violation fixtures (oversized diff, cross-territory diff, forbidden
  bash command, fake credential). Run: `pnpm --filter @kyndro/infra test`.

Neither script has been exercised against a real GitHub Actions runner in
this session (no network egress in this sandbox) — only the underlying
logic, locally. A human should confirm `pipeline.yml` triggers correctly on
the first real PR (see ADR-011).

## Hooks (`hooks/`)
See `hooks/README.md`. Hardened, unit-tested replacements for the
HUMAN-SETUP.md §5 starter one-liners, plus a linter step (ADR-013). An agent
cannot write `.claude/settings.json` itself (blocked as self-modification of
protected agent config) — a human must paste the updated block documented in
`hooks/README.md`.

## Envs (`envs/`)
`dev.env.example` / `staging.env.example` — variable NAMES only, no values
(PLAN.md §6). Matches HUMAN-SETUP.md §3's secret table plus the telemetry
DSN var from ADR-012.

## Telemetry
Lives in `/platform/telemetry/`, not here (platform code, not infra
tooling) — see `platform/telemetry/` and ADR-012.
