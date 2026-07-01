# ADR-006: Ship optional spec provenance + confidence fields in v1

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-CONTRACT
- **Originating packet:** W1-PLAT-1

## Context
Sprint 4 introduces candidate specs carrying provenance (`mined | static | proposed`)
and a confidence score. The packet requires v1 shapes to make that addable without a
breaking change, and explicitly allows including the fields now if it makes fixtures
more realistic — noting the choice in an ADR. This is that ADR.

## Decision
We will include `provenance` (enum: `mined`, `static`, `proposed`) and `confidence`
(number, 0..1) on the `Spec` schema **now, as optional fields**. Servers that predate
the miner simply omit them; the spec-review UI can be designed against realistic
fixture data from day one. All 10 golden candidate specs carry both fields.

## Alternatives considered
- **Omit until Sprint 4** — adding optional fields later is also non-breaking, but
  fixtures would show an unrealistically bare spec inbox and the FE would design a
  screen that Sprint 4 immediately invalidates.
- **Required fields now** — forces pre-miner backends to fabricate values; optional is
  the honest shape.

## Consequences
The Sprint 4 miner packet extends behavior, not shape. The provenance enum is
contract law once frozen; adding a fourth source later is an additive enum change but
still G-CONTRACT-gated. Consumers MUST tolerate both fields being absent.
