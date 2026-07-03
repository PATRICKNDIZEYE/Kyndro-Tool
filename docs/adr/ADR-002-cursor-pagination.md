# ADR-002: Cursor pagination with a data/next_cursor envelope

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-CONTRACT
- **Originating packet:** W1-PLAT-1

## Context
`/repos`, `/runs`, `/runs/:id/obligations`, and `/specs` are all list endpoints; runs
and obligations grow unboundedly and are written concurrently by workers while users
paginate. The pagination style must be fixed before mocks and screens are built.

## Decision
We will paginate every list endpoint with an opaque `cursor` query parameter plus a
`limit` (default 30, max 100), and wrap every list response in
`{ "data": [...], "next_cursor": string | null }`. `next_cursor: null` means last
page. Cursors are opaque; clients MUST NOT construct or parse them.

## Alternatives considered
- **Offset/limit** — skews under concurrent inserts (verdicts stream in while the user
  paginates), and OFFSET degrades on large run tables.
- **Link headers (RFC 5988)** — awkward through generated TypeScript clients and MSW
  mocks; envelope keeps everything visible in the JSON body.

## Consequences
Backend must implement keyset pagination (easy on ULID-sorted ids per ADR-001).
"Jump to page N" UIs are impossible — FE must design around infinite scroll /
next-page. The envelope leaves room to add sibling metadata (e.g. `total_estimate`)
without a breaking change.
