# ADR-003: Single structured error envelope

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-CONTRACT
- **Originating packet:** W1-PLAT-1

## Context
Every non-2xx response needs one shape so the frontend can build a single error
handler, the CLI can render failures consistently, and contract tests can assert on
errors mechanically.

## Decision
We will return every error as
`{ "error": { "code": "SCREAMING_SNAKE", "message": "...", "details": { ... } } }`.
`code` is a stable, machine-readable vocabulary (clients branch on it); `message` is
human-readable and explicitly unstable; `details` is optional structured context
(e.g. field-level validation errors). One schema (`ErrorEnvelope`) is referenced by
every 4xx/5xx response in openapi.yaml.

## Alternatives considered
- **RFC 7807 `application/problem+json`** — standard, but the `type`-as-URI
  ceremony adds friction with no consumer that wants it yet; can be adopted later by
  mapping `code` onto `type` if a public API demands it.
- **Bare `{ "message": ... }`** — no stable field to branch on; frontends end up
  string-matching messages, which then can never be reworded.

## Consequences
Backend must maintain a registered code vocabulary (first entries: `UNAUTHORIZED`,
`NOT_FOUND`, `VALIDATION_FAILED`). The nested `error` key leaves the top level free
for future additions (e.g. `request_id`) without a breaking change.
