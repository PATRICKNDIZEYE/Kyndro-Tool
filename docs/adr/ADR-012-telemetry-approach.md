# ADR-012: Local structured-log telemetry transport as the v1 stand-in

- **Status:** PROPOSED
- **Date:** 2026-07-03
- **Proposed by:** BE-PLAT (agent)
- **Gate:** G-DEP
- **Originating packet:** W1-PLAT-2

## Context
W1-PLAT-2 requires `/platform/telemetry/**` to exist so errors thrown by the
platform can be captured. A real error-tracking vendor (e.g. Sentry) needs an
account and a DSN secret — HUMAN-SETUP.md §3 already reserves the name
`ERROR_TRACKING_DSN` for this, but marks it "needed from W1-PLAT-2" and it has
not been provisioned by a human yet. No human is present in this session to
sign up for a vendor account or hand over a real DSN, and PLAN.md §6 forbids
ever storing secrets in code, so no placeholder/fake DSN can be fabricated.

This is the same shape of problem already solved twice this session: ADR-009
(mock tooling) and ADR-010 (waitlist storage) both used an honest local
stand-in behind a narrow interface rather than blocking or faking a vendor
integration.

## Decision
We will define a minimal `Transport` interface
(`capture(event: TelemetryEvent): void`) in `/platform/telemetry/index.ts`,
with a single v1 implementation, `/platform/telemetry/transports/local.ts`,
that appends newline-delimited JSON events to a local log file (path driven
by an `ERROR_TRACKING_DSN`-shaped env var that, for now, is interpreted as a
local file path when it starts with `file:` and otherwise falls back to a
default local path — never a real network call). This lets any platform code
call `telemetry.capture(...)` today, and swapping in a real vendor SDK later
is a change to which transport is constructed, not a rewrite of call sites.

## Alternatives considered
- **Sentry SDK wired in now with a placeholder DSN** — rejected: PLAN.md §6
  forbids fabricated secrets in code, and a placeholder DSN would either
  silently no-op (misleading — looks integrated but isn't) or attempt a real
  network call from the sandbox (forbidden — "no network calls from the
  verification sandbox").
- **No telemetry module until a human provisions a vendor** — rejected: fails
  the packet's deliverable and blocks every future packet's error paths from
  having anywhere to report to; the interface seam has value on its own.
- **console.error only, no file** — rejected: not queryable/inspectable after
  the process exits, and weaker to demonstrate/test than a persisted file.

## Consequences
- Easier: future packets can call `telemetry.capture()` without knowing
  whether the backing transport is local or a real vendor.
- Easier: this session's tests can assert against the local file's contents
  directly, proving capture actually happens end-to-end.
- Harder: no real alerting/dashboards exist yet — a human must accept this
  ADR and then provision a real `ERROR_TRACKING_DSN` (and implement a second
  `Transport`, e.g. `transports/sentry.ts`) before production errors are
  actually visible anywhere off-disk.
- Introduces no new paid service, no new secret value (only the existing
  reserved env var name), and no network egress.
