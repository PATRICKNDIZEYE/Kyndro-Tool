# ADR-011: Use GitHub Actions for CI, backed by standalone Node scripts

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** BE-PLAT (agent)
- **Gate:** G-DEP
- **Originating packet:** W1-PLAT-2

## Context
PLAN.md §4.3 requires four checks to run on every PR: contract tests (both
directions), the full test suite, a PR-size check (fails >400 changed lines
with "split this packet"), and a territory check (diff paths must be a subset
of the owner's territory). No CI provider or pipeline exists yet in the repo.
The repo already lives on GitHub (HUMAN-SETUP.md item 1 is the only ✅ DONE
item), so a CI choice that doesn't require a new vendor account or secret is
strongly preferred while no human is present to provision one.

No human is available synchronously to approve a new dependency (this session
is running unattended for ~7 hours). Per the session's standing "ADR-and-proceed"
rule, this ADR is filed as PROPOSED and the implementation proceeds immediately;
a human reviews/accepts on return.

## Decision
We will use **GitHub Actions** as the CI provider, defined in
`/infra/ci/pipeline.yml`. The four required checks are implemented as thin
Actions job steps that shell out to standalone, unit-testable Node scripts in
`/infra/ci/scripts/` (`check-pr-size.mjs`, `check-territory.mjs`). Contract
tests and the full test suite reuse each package's existing `pnpm test`
scripts (established in prior packets: `app/`, `site/`, `contract/`) rather
than duplicating test logic in YAML. Keeping the size/territory logic in
plain Node scripts (not inline `run:` shell one-liners) makes them testable
locally without a GitHub Actions runner, which matters because this sandbox
has no network egress and cannot execute real Actions runs — the scripts are
what get verified here; the workflow YAML wiring itself is not exercised
end-to-end in this session.

## Alternatives considered
- **CircleCI / Buildkite / other external CI** — rejected: requires a new
  vendor account, a webhook secret, and human sign-up outside GitHub. No
  benefit over Actions for a repo that's already on GitHub.
- **Inline shell logic in the workflow YAML** (e.g. `git diff --stat | awk ...`
  for size, `git diff --name-only | grep ...` for territory) — rejected: not
  unit-testable in isolation, harder to seed with violation fixtures, and
  harder for future packets to extend (e.g. adding new territories).
- **A single monolithic `ci-check.mjs` doing all four checks** — rejected:
  couples unrelated failure modes (a territory-check bug would block PR-size
  reporting too) and makes required-check status in GitHub's PR UI less
  legible (humans see one generic red X instead of which check failed).

## Consequences
- Easier: future packets that need new CI checks add another script + job
  block, following the same pattern.
- Easier: the size/territory scripts can be run locally (`node
  infra/ci/scripts/check-pr-size.mjs`) by any agent before pushing, catching
  violations before CI would.
- Harder: the workflow YAML itself has not been validated against a real
  GitHub Actions runner in this sandbox (no network egress). A human must
  confirm the workflow actually triggers and passes on the first real PR.
- No new paid service or account is introduced; GitHub Actions is included
  with the existing GitHub repo (HUMAN-SETUP.md item 1).
- Future packets: the CI-scripts package's territory table (which paths map
  to which agent) must be kept in sync with PLAN.md §3 by hand until/unless a
  packet automates that sync.
