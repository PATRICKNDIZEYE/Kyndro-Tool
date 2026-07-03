# @kyndro/site

Marketing landing page + waitlist capture for kyndro.app. Not deployed by any
agent — G-PUB is human-only (see `tasks/W1-SYS-2.yaml` and
`docs/adr/ADR-010-waitlist-storage.md`).

## Commands

- `pnpm --filter @kyndro/site dev` — dev server with the local waitlist API
  (`POST /api/waitlist`, backed by `site/data/waitlist.json`, gitignored).
  Submit the form in the browser and confirm the file gets a new row.
- `pnpm --filter @kyndro/site build` — typecheck + production static build
  to `site/dist/`. No server code ships in this output (see ADR-010).
- `pnpm --filter @kyndro/site preview` — serve the production build
  statically (no waitlist API — that's dev-only).
- `pnpm --filter @kyndro/site test` — unit tests for email validation and the
  waitlist store (temp-file backed, no network).

## Measuring Lighthouse (acceptance: >= 90 on performance, accessibility,
best-practices)

Run against the production build, not the dev server:

```sh
pnpm --filter @kyndro/site build
pnpm --filter @kyndro/site preview --port 4300 &
npx --yes lighthouse@12 http://localhost:4300 \
  --output=json --output-path=site/lighthouse-report.json \
  --chrome-flags="--headless" \
  --only-categories=performance,accessibility,best-practices
kill %1
```

This wasn't run in this session (no Chrome/headless-Chromium available in
the sandbox); flagged in `tasks/W1-SYS-2.yaml` for the human to verify.

## Storage

`site/server/waitlistStore.ts` is a local JSON-file table — the v1
implementation per ADR-010. It intentionally has a two-function interface
(`appendEntry`, `readAll`) so swapping in a real hosted table later (once a
human provisions one and names a secret) is a small, isolated change.

## Deploy

Not this agent's job. When a human is ready to publish, file/complete the
G-PUB request referencing this packet and point it at a static host serving
`site/dist/` plus wherever the real (human-provisioned) waitlist storage
ends up living.
