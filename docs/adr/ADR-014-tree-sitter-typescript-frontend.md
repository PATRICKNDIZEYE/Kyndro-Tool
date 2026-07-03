# ADR-014: web-tree-sitter (WASM) for the TypeScript parser frontend

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** BE-CORE (agent)
- **Gate:** G-DEP
- **Originating packet:** W1-CORE-1

## Context
W1-CORE-1 is an architecture spike: tree-sitter → typed IR proof-of-concept
on TypeScript (parse, walk, print a function inventory), seeding the W3
semantic-diff work. tree-sitter itself is a new dependency and needs an ADR
+ G-DEP before use (PLAN.md §5, §6). No human is present in this session to
approve synchronously; per the session's standing "ADR-and-proceed" rule,
this is filed PROPOSED and implementation proceeds immediately.

Two ways to consume tree-sitter from Node exist: the native `tree-sitter` +
`tree-sitter-typescript` bindings (a compiled native addon, built via
node-gyp at install time), or `web-tree-sitter` (the WASM build of the
tree-sitter runtime) paired with a prebuilt `.wasm` grammar file. Native
addons need a working C/C++ toolchain (python, make, a C compiler) at
`pnpm install` time; that toolchain's presence in this sandbox, in CI
runners, and on every future contributor's machine is not guaranteed, and a
failed native build would silently or loudly break `pnpm install` for the
whole monorepo, not just `/engine/`.

## Decision
We will use **`web-tree-sitter`** (the WASM runtime) plus the TypeScript
grammar shipped as a prebuilt `.wasm` file, loaded from the
`tree-sitter-typescript` npm package's `tree-sitter-typescript.wasm`
artifact. `/engine/parser/` wraps this in a small async `parseTypeScript(src:
string): Promise<Tree>` API so the rest of `/engine/` never touches
tree-sitter's raw API directly. This trades a small amount of runtime
overhead (WASM instantiation, one-time per process) for zero native
compilation anywhere in the toolchain — every environment that can run
Node can run this, with no node-gyp/python/compiler dependency.

## Alternatives considered
- **Native `tree-sitter` + `tree-sitter-typescript` bindings** — rejected for
  this spike: faster at runtime, but requires a native build step that can
  fail unpredictably across sandboxes/CI/contributor machines; for an
  architecture spike whose purpose is to validate the IR design, not to
  benchmark parse speed, portability wins.
- **A hand-rolled TypeScript parser (e.g. wrapping the TypeScript compiler
  API, `ts.createSourceFile`)** — rejected: the whole point of this spike is
  to validate tree-sitter specifically as the W3 semantic-diff foundation
  (incremental re-parsing, concrete syntax trees for diffing), which the
  TypeScript compiler's AST does not provide in the same form.
- **Babel parser (`@babel/parser`)** — rejected: same reasoning as above; it
  produces an AST, not a tree-sitter CST, so it wouldn't validate anything
  about the tree-sitter-specific properties W3 depends on.

## Consequences
- Easier: `pnpm install` never invokes a native build for this package; the
  same `.wasm` file works identically in this sandbox, CI, and on any
  contributor's machine.
- Easier: tree-sitter's incremental parsing and concrete-syntax-tree
  properties (needed for W3's AST diff) are preserved — this is still a
  real tree-sitter tree, just loaded via WASM instead of a native addon.
- Harder: WASM instantiation has a small one-time startup cost per process;
  acceptable for a spike and for typical batch/CLI usage, but should be
  revisited (e.g. a long-lived worker pool, or switching to native bindings)
  if `/engine/` ends up on a latency-sensitive hot path later.
- Future packets building on this (W3 semantic-diff) inherit
  `/engine/parser/`'s `parseTypeScript()` API rather than calling
  web-tree-sitter directly, so a later swap to native bindings (if ever
  needed) is contained to one module.
- No new paid service; `web-tree-sitter` and `tree-sitter-typescript` are
  both open-source npm packages installed as regular dependencies.
