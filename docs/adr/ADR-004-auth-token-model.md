# ADR-004: GitHub OAuth code exchange issuing opaque bearer tokens

- **Status:** PROPOSED
- **Date:** 2026-07-02
- **Proposed by:** BE-PLAT
- **Gate:** G-CONTRACT
- **Originating packet:** W1-PLAT-1

## Context
Sprint 1 requires the auth surface in contract v1 and a token model design. Kyndro's
only identity provider is GitHub (the product is a GitHub App); the frontend needs a
login flow it can mock now, and later packets (G-SEC territory) implement it.

## Decision
We will expose exactly two auth endpoints in v1: `POST /auth/github` exchanges a
GitHub OAuth authorization code for a Kyndro session (`{ token, user }`, where
`token.access_token` is an **opaque** server-side token with an `expires_at`), and
`GET /auth/me` returns the caller's identity. All other endpoints require
`Authorization: Bearer <token>`. Clients MUST NOT parse tokens; there are no client-
visible claims.

## Alternatives considered
- **JWTs with client-readable claims** — freezes claim shape into the contract,
  invites clients to trust unverified payloads, and makes revocation awkward. Nothing
  in v1 needs client-side claims.
- **Forwarding the GitHub token as the API credential** — couples our session
  lifetime to GitHub's, and hands a broader-scoped credential to the browser than the
  API needs.

## Consequences
Backend owns token storage/revocation (server-side lookup — fine at this scale).
Refresh tokens are additive later (new field on `AuthSession`), not a breaking
change. The implementation lands in `/platform/auth/**`, which is G-SEC territory —
this ADR only fixes the contract surface.
