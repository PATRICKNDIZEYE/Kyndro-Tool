# /engine — tree-sitter → typed IR spike (W1-CORE-1)

Architecture spike seeding the W3 semantic-diff work: parse TypeScript with
tree-sitter, walk the resulting tree into a small typed IR, print a function
inventory. Function-level granularity is the deliberate unit (PLAN.md §4.1's
blast-radius worked example is function-level).

## Layout
- `parser/index.ts` — `parseTypeScript(source): Promise<{ tree, source }>`.
  Wraps `web-tree-sitter` + the `tree-sitter-typescript` WASM grammar
  (ADR-014: WASM chosen over native bindings to avoid a native-compile step
  anywhere in the toolchain).
- `parser/errors.ts` — `describeParseErrors(tree, filePath, source)` /
  `formatParseError(error)`: walks ERROR/missing nodes into a located,
  human-readable message (BE-CORE charter: bad input is product surface).
- `ir/types.ts` — `FunctionInfo`, `FunctionParameter`, `SourceSpan`.
- `ir/walker.ts` — `buildFunctionInventory(tree, filePath): FunctionInfo[]`.
  Flattens every function declaration, function expression, arrow function,
  and class method into one array, in source order, with export/default/
  class/generic/parameter metadata attached.
- `ir/print.ts` — `formatFunctionInventory(functions): string`. One line per
  function: `file:line:col  <modifiers> <kind> Name.method(params): returnType`.

## Running it
```
pnpm --filter @kyndro/engine test    # 39 tests: 26 golden + 7 fixture-repo + 5 error-message + 1 smoke
pnpm --filter @kyndro/engine build   # tsc --noEmit
```

## What this spike does NOT cover (by design — see the packet's scope)
- TSX/JSX (`tree-sitter-typescript` ships a `tsx` grammar too; not wired in —
  plain `.ts` only, per this packet's scope).
- Incremental re-parsing / edits (tree-sitter supports it; W3 will need it
  for the semantic-diff work this spike is seeding, not this packet).
- Any notion of call graph, AST diff, or blast radius — those are W3.
- Anonymous class expressions assigned to a variable (`const C = class {
  ... }`) do not currently pick up the variable's name as the class name;
  their methods' `className` comes back `undefined`. Not encountered in the
  `/fixtures/sample-repo` sample and not covered by a golden test — flagged
  here rather than silently handled wrong.

## Known gap vs. the walker's export detection
`isExported`/`isDefaultExport` are computed structurally (is this node a
direct child, through transparent wrappers, of an `export_statement`?), not
semantically (e.g. `export { foo }` after-the-fact re-export lists, or
`module.exports = ...` CommonJS patterns) — TypeScript ESM `export`/
`export default` inline forms only, which is what the fixture repo and the
rest of the Kyndro codebase use.
