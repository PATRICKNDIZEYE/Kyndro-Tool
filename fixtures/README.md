# Golden fixtures v1.0.0

The versioned golden fixture library (PLAN.md §3: BE-PLAT publishes, everyone reads).
All payloads conform to `/contract/` schemas and tell **one coherent story** about the
sample repository in `sample-repo/`:

> PR #42 on `acme/sample-shop` ("discounts: allow stacking multiple promotions")
> modifies `applyDiscount()` in `src/discount.ts`. Stacked percentage discounts are
> summed without clamping, so two 60% codes drive a 100-cent cart to **-20 cents**.
> Kyndro run `run_...t1` analyzes the diff, puts `applyDiscount` (changed) and
> `checkout` (blast radius) under obligation, and returns one verdict of each kind:
> `VERIFIED` (discount never increases the total — bounded evidence attached),
> `FALSIFIED` (total can go negative — shrunken counterexample attached), and
> `UNKNOWN` (`checkout` crosses an external-effect boundary).

## Contents

| Path | What |
| --- | --- |
| `sample-repo/` | Tiny TypeScript e-commerce project (no deps) that analysis packets parse |
| `analyzed-pr/run-pr42.json` | The sample analyzed PR — a `RunDetail` for PR #42 |
| `obligations/` | One obligation per verdict state (VERIFIED / FALSIFIED / UNKNOWN) |
| `counterexamples/` | The one counterexample (negative total), shrunken + replayable |
| `specs/candidate-specs.json` | 10 candidate specs over `sample-repo` functions, with provenance + confidence |
| `repos/repo-shop.json` | The connected repository record |
| `events/` | One sample payload per webhook event schema |
| `manifest.json` | Maps every payload to the schema it must satisfy; carries the fixture-set version |
| `validate.py` | CI gate — validates everything above against `/contract/` |

## Validate (CI-runnable)

```sh
python3 fixtures/validate.py
```

Exits non-zero on any schema mismatch. Also enforces the golden-set invariants:
exactly the 3 verdict states across the obligation fixtures, verdict-dependent fields
consistent, exactly 10 specs, exactly 1 counterexample, and a non-null `pr` on the
analyzed-PR fixture.

## Notes for consumers

- Spec `body` text is **non-normative placeholder syntax** — the spec DSL is a G-DSL
  decision that has not been made. Do not build a parser against it.
- The candidate specs are shown pre-acceptance (`status: candidate`); obligations
  reference their ids because runs evaluate candidates in shadow mode.
- `sample-repo` reflects the **head** of PR #42, i.e. it contains the discount-stacking
  bug the FALSIFIED fixture describes. That is intentional.
- Bump `manifest.json`'s `version` on any fixture change; fixture changes ride the same
  G-CONTRACT gate as contract changes when they encode shape decisions.
