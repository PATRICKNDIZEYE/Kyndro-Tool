# ADR-005: Self-contained event schemas with a common envelope

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-CONTRACT
- **Originating packet:** W1-PLAT-1

## Context
`run.started`, `run.updated`, and `run.completed` are delivered over webhooks and
later over SSE/websocket. Consumers (frontend, CLI, customer webhooks eventually)
need to dispatch, deduplicate, and order events without calling back into the API.

## Decision
We will wrap every event in the envelope
`{ "id": "evt_<ulid>", "type": "<event name>", "created_at": <rfc3339>, "data": { "run": <snapshot>, ... } }`
and keep each event's JSON Schema file fully self-contained (RunSnapshot defined in
local `$defs`, no cross-file `$ref`), so any consumer can validate a payload with one
file and no resolver. `id` is the deduplication key; ULID ordering (ADR-001) gives
per-run event ordering. `run.updated` additionally carries `changed_obligations`
(id + verdict deltas). `RunSnapshot.pr` carries the same `PullRequestRef` shape as
the REST `Run.pr` (changed at the G-CONTRACT gate from a bare `pr_number` integer,
so consumers never write mapping code for it). RunSnapshot still intentionally
omits `trigger` and `obligation_count` — fetch the run via REST if you need them.

## Alternatives considered
- **Shared `common.schema.json` referenced by all three** — DRY, but forces every
  consumer's validator to resolve relative refs; brittle in browsers, CI, and
  third-party webhook consumers.
- **CloudEvents** — heavier envelope with no consumer that speaks it; our envelope is
  a strict subset in spirit and could be mapped later.

## Consequences
The RunSnapshot block is duplicated across the three schema files; BE-PLAT must keep
them in sync (fixtures + validate.py catch drift). Delivery signatures
(`X-Kyndro-Signature`) are transport concerns for the webhooks packet, not the
payload schema.
