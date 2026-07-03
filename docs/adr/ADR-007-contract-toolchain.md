# ADR-007: Contract toolchain — pinned npx validators + zero-dep fixture checker

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-DEP
- **Originating packet:** W1-PLAT-1

## Context
The contract packet needs (a) an OpenAPI 3.x validator, (b) a TypeScript type
generator for `@kyndro/types`, and (c) a fixture-vs-schema checker — all CI-runnable.
Hard rules forbid dependency installs; `npx <tool>` is permitted only with a PROPOSED
ADR. This ADR covers the contract toolchain as a set.

## Decision
We will use, without installing anything into the repo:
1. **`npx --yes @redocly/cli@1.34.3 lint`** (config: `contract/redocly.yaml`) to
   validate `contract/openapi.yaml` — OpenAPI 3.1-aware, exits non-zero on errors.
2. **`npx --yes openapi-typescript@7.4.4`** (wrapped by
   `contract/scripts/generate-types.sh`) to generate `contract/types/index.d.ts` —
   deterministic output, committed to the repo.
3. **`python3 fixtures/validate.py`** — stdlib + preinstalled PyYAML only; implements
   the JSON Schema subset the contract uses, validating every fixture against both
   the OpenAPI components and the event schemas, plus golden-set invariants.

Versions are pinned exactly; bumping either is a contract-change task under this ADR.

## Alternatives considered
- **`@apidevtools/swagger-cli`** — effectively unmaintained and weak on OpenAPI 3.1.
- **`ajv-cli` for fixtures** — validates raw JSON Schema well, but cannot point into
  OpenAPI component schemas without a conversion step; a second npx tool for less
  coverage than the 200-line python checker provides.
- **Vendoring validator code** — heavier to review than pinned npx invocations.

## Consequences
No `package.json` dependencies, no lockfile, nothing to install; CI needs network
access to the npm registry for the two pinned tools (first run caches). G-DEP
approval of this ADR sanctions exactly these two external tools at exactly these
versions; the fixture gate itself has zero external dependencies.
