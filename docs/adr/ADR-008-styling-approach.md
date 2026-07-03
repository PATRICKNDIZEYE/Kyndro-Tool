# ADR-008: CSS Modules + CSS custom-property tokens, Storybook as the component workbench

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** FE-SYS
- **Gate:** G-DEP
- **Originating packet:** W1-SYS-1

## Context
W1-SYS-1 needs a styling approach and a component workbench before any component ships.
Per the FE-SYS charter (PLAN.md §2), whatever is picked here is binding for every later
wave — there must be exactly one styling approach, never a second one introduced later.
kyndro-sprint-plan.md names Storybook explicitly as the intended workbench tool. No human
was available to approve G-DEP synchronously during this build session (autonomous run,
2026-07-03); per the run's ADR-and-proceed convention this ADR is written PROPOSED and the
tooling is used immediately so the wave isn't blocked on a human being present. A human
should ACCEPT or REJECT this ADR after the fact — rejection means a follow-up packet
migrates `/app/design-system/` to the replacement approach before other packets build on it.

## Decision
We will use plain CSS Modules (`*.module.css`, zero extra runtime dependency, built into
Vite) for component styling, with all values (color, spacing, typography, radius) sourced
from CSS custom properties defined once in `tokens/tokens.css` and mirrored as typed TS
constants in `tokens/*.ts` for non-CSS consumers (e.g. chart libraries, inline style edge
cases). Storybook (`@storybook/react-vite`) is the component workbench; `@storybook/addon-a11y`
provides the a11y lint this packet's acceptance criteria require.

## Alternatives considered
- **Tailwind CSS** — rejected: adds a utility-class build step and a second styling
  vocabulary (utility classes vs. tokens) that the charter's "never a second styling
  approach" NEVER rules out extending later; CSS Modules keeps one vocabulary (tokens
  only) for the life of the project.
- **CSS-in-JS (vanilla-extract / styled-components)** — rejected for W1: higher setup
  cost and (for styled-components) runtime cost, for no benefit over CSS Modules at this
  component count. Revisit only via a new ADR if theming needs outgrow custom properties.
- **Chromatic-hosted Storybook** — rejected for now: a paid service is a separate G-DEP
  decision; local Storybook build satisfies this packet's acceptance criterion
  ("Storybook builds") without it.

## Consequences
Easier: zero extra styling dependency, tokens are the only source of visual truth, any
later theming (dark mode, brand refresh) is a token-file edit, not a component rewrite.
Harder: no automatic vendor prefixing or utility shorthand — accepted, scope is small.
Binding for FE-APP and FE-SYS in every later wave: components must consume tokens via CSS
custom properties, never hardcoded hex/px values. New dependency introduced: `storybook`
family of packages (dev-only, not shipped to production bundles) — cost is build tooling
only, no runtime or paid-service cost.
