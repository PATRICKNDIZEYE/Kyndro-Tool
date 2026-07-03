# ADR-001: Prefixed opaque ULID identifiers for all API resources

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-CONTRACT
- **Originating packet:** W1-PLAT-1

## Context
Contract v1 needs a single ID convention before anything is built against it. IDs
appear in URLs, webhook payloads, CLI output, and replay commands, and both build
tracks will hard-code assumptions about them from day one.

## Decision
We will use opaque string IDs of the form `<type>_<ulid>`: a short lowercase resource
prefix (`repo_`, `run_`, `obl_`, `spec_`, `cex_`, `user_`, `evt_`) plus a 26-character
lowercase Crockford-base32 ULID. IDs are lexically sortable by creation time,
URL-safe, self-describing in logs, and clients MUST treat them as opaque.

## Alternatives considered
- **Bare UUIDv4** — not sortable, unreadable in logs, prefix-less IDs get pasted into
  the wrong endpoint without any error surface.
- **Serial integers** — enumerable (security smell for a multi-tenant product), leak
  volume information, awkward for offline generation by workers.

## Consequences
Cursor pagination can lean on ULID sortability. The `pattern` constraints in
openapi.yaml and the event schemas encode this format, so changing it later is a
breaking contract change. Fixture IDs follow the format and validate against it.
