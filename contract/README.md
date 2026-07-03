# Kyndro contract v1

This directory is the **shared API contract** — the single source of truth both build
tracks implement against. It is owned by BE-PLAT via contract-change tasks only and is
frozen by human gate **G-CONTRACT** (PLAN.md §3). Everyone else reads.

## Layout

| Path | What it is |
| --- | --- |
| `openapi.yaml` | OpenAPI 3.1 spec: auth, `/repos`, `/runs`, `/runs/:id`, `/runs/:id/obligations`, `/specs` |
| `events/*.schema.json` | JSON Schema (draft 2020-12), one per webhook event: `run.started`, `run.updated`, `run.completed` |
| `types/` | `@kyndro/types` — TypeScript types generated from `openapi.yaml` (committed; never hand-edited) |
| `scripts/generate-types.sh` | Regenerates `types/index.d.ts` |
| `redocly.yaml` | Lint config for the validator |

Tooling choices (pinned `npx` invocations, zero installs) are PROPOSED in ADR-007 and
gated by G-DEP.

## Validate the OpenAPI spec (CI-runnable)

From the repo root:

```sh
npx --yes @redocly/cli@1.34.3 lint --config contract/redocly.yaml contract/openapi.yaml
```

Exits non-zero on any error. Acceptance requires zero errors.

## Validate fixtures against the contract (CI-runnable)

Every golden fixture in `/fixtures/` is validated against these schemas by a
zero-dependency script (python3 + PyYAML, both preinstalled):

```sh
python3 fixtures/validate.py
```

Exits non-zero on any mismatch. See `/fixtures/README.md` for what it checks.

## Generate `@kyndro/types`

```sh
contract/scripts/generate-types.sh
```

Invokes `openapi-typescript` at an exactly pinned version, writing
`contract/types/index.d.ts`. Generation is deterministic: running it twice yields
byte-identical output (`git diff --exit-code contract/types` after a re-run is the CI
check). The generated file is committed so consumers never need to generate it
themselves; publishing/wiring the package into apps happens in later packets.

## Change protocol

1. A contract-change task packet is filed and assigned to BE-PLAT.
2. BE-PLAT edits this directory on a dedicated branch, regenerates types, revalidates
   fixtures, and files ADRs for any shape decision.
3. A human approves at G-CONTRACT. Merge = freeze.

Verdict vocabulary is law: obligations are exactly `VERIFIED` (always bounded, with
`BoundedVerification` evidence), `FALSIFIED` (with a counterexample), or `UNKNOWN`
(with a reason). No fourth state.
