# ADR-013: ESLint as the PostToolUse linter, wired to no-op when unconfigured

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** BE-PLAT (agent)
- **Gate:** G-DEP
- **Originating packet:** W1-PLAT-2

## Context
HUMAN-SETUP.md §5 ships a starter `PostToolUse` hook that only runs a secret
scanner and explicitly says: "Linter on touched files — the linter isn't
chosen yet (ADR + G-DEP in W1-PLAT-2)." This packet closes that gap. At the
time of writing, three sibling branches (`w1/fe-sys-tokens-components`,
`w1/fe-app-mock-server`, `w1/fe-sys-landing-waitlist`) each carry their own
TypeScript packages, none merged to `main` yet and none with a committed
ESLint config — so whatever linter is chosen must degrade gracefully (skip,
not block) on a package with no config yet, rather than fail every Edit/Write
across the whole repo the moment this hook lands.

## Decision
We will use **ESLint** as the linter invoked from the hardened PostToolUse
hook (`infra/hooks/post_tool_use_scan.py`). Before linting, the hook walks up
from the touched file looking for an ESLint config file
(`eslint.config.*`, `.eslintrc*`); if none is found, it logs a one-line skip
notice and exits 0 (does not block). If a config is found, it shells out to
`npx eslint <file>` and blocks (exit 2) only on actual lint errors, with
stderr surfaced to the agent. This keeps the hook forward-compatible: once
any package's owning agent commits an ESLint config, linting turns on for
that package automatically with no hook change needed.

## Alternatives considered
- **Biome** — rejected for now: faster and simpler config, but the team has
  no existing ESLint-vs-Biome decision on record and ESLint has broader
  TypeScript/React rule-set maturity for the packages already in flight
  (`app/`, `site/`). Revisit later if lint runs become a speed bottleneck.
- **Prettier only** — rejected: formatting-only, does not catch the class of
  bugs (unused vars, unreachable code, hook-rule violations) a linter is
  meant to catch per PLAN.md §4.3's "runs linter + secret scanner" wording.
- **Block every Edit/Write on any package without an ESLint config** —
  rejected: would immediately block all in-flight sibling branches that
  predate this ADR, which is a worse outcome than temporarily skipping.

## Consequences
- Easier: any future packet gets lint-on-write for free the moment it adds
  an ESLint config to its package — no hook change required.
- Harder: until every package has a config, this hook's linting is silently
  inert for that package; a human should track that as a follow-up per
  package (tracked informally via each packet's own acceptance criteria).
- No new paid service. `eslint` becomes a new devDependency wherever a
  config is added. No package in the repo has one yet as of this packet
  (verified by grepping every branch's `package.json`s), so in practice the
  hook's skip path is what's exercised today; the first package to add a
  config (any future packet) is what turns linting on for real. That means
  this packet ships and tests the skip path plus the config-discovery logic,
  not a live end-to-end ESLint run — flagged honestly rather than adding a
  config here just to make the happy path exercisable.
