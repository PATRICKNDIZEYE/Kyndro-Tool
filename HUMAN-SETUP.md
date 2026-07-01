# HUMAN-SETUP — things only you can do

Agents cannot (and must not) do any of the following. Each item lists the exact command or URL.
Work through top to bottom; §1–§3 are needed before W1 opens, §4–§6 before multi-agent fan-out.

---

## 1. Create the GitHub repository and push

The local repo exists on branch `bootstrap/w0`. No remote is configured.

```bash
cd /Users/sshazul/Documents/Fable-Eval
gh repo create kyndro --private --source=. --remote=origin
git push -u origin main
git push -u origin bootstrap/w0
```

(If ORCH already created the repo/PR with your approval, skip this and verify at
https://github.com/<owner>/kyndro.)

## 2. Branch protection on `main` — agents never merge

Do this BEFORE approving any agent PR. This is the mechanism behind PLAN.md §1 P3 and the
first NEVER in §6 — politeness does not enforce it, this does.

```bash
gh api -X PUT "repos/{owner}/kyndro/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["contract-tests", "test-suite", "pr-size-check", "territory-check"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Notes:
- The four `contexts` names must match the CI job names W1-PLAT-2 creates. Until that packet
  lands, apply the block WITHOUT `required_status_checks` (set it to `null`), then re-run the
  full command after W1-PLAT-2 merges.
- If agents ever get their own machine accounts, do NOT grant them merge rights; PRs only.
- UI alternative: https://github.com/<owner>/kyndro/settings/branches → Add rule for `main`.

## 3. Repo secrets — NAMES only, you supply the values

Set at https://github.com/<owner>/kyndro/settings/secrets/actions
(or `gh secret set <NAME>` and paste the value when prompted). Never let a value into the
repo, a fixture, a packet, or a chat with an agent.

| Secret NAME | Needed from | Purpose |
|---|---|---|
| `KYNDRO_GITHUB_APP_ID` | W2 | GitHub App auth |
| `KYNDRO_GITHUB_APP_PRIVATE_KEY` | W2 | GitHub App signing key (PEM) |
| `KYNDRO_GITHUB_WEBHOOK_SECRET` | W2 | Webhook signature verification |
| `DATABASE_URL` | W2 | Postgres (queue + run state) |
| `ERROR_TRACKING_DSN` | W1-PLAT-2 | Error tracker (vendor per ADR/G-DEP) |
| `WAITLIST_STORAGE_KEY` | W1-SYS-2 | Landing-page waitlist table (vendor per ADR/G-DEP) |
| `ANTHROPIC_API_KEY` | W8 | LLM spec-proposal service |
| `STRIPE_SECRET_KEY` | W11 | Billing plumbing |
| `STRIPE_WEBHOOK_SECRET` | W11 | Stripe webhook verification |

## 4. GitHub App registration (needed at W2 open; placeholders now)

Register at: https://github.com/settings/apps/new

| Field | Value |
|---|---|
| App name | `kyndro-dev` (prod app registered separately at launch, G-PUB) |
| Homepage URL | `https://kyndro.app` (placeholder until the site is live) |
| Webhook URL | `<staging-webhook-endpoint>` — W2-PLAT-1 will supply this; use a placeholder + smee.io/ngrok for dev |
| Webhook secret | generate: `openssl rand -hex 32` → store as `KYNDRO_GITHUB_WEBHOOK_SECRET` |
| Permissions | Checks: read/write · Contents: read/write · Pull requests: read/write · Metadata: read |
| Subscribed events | `pull_request`, `installation`, `installation_repositories` |

After creating: note the App ID → `KYNDRO_GITHUB_APP_ID`; generate a private key (.pem
download) → `KYNDRO_GITHUB_APP_PRIVATE_KEY`. Any later permission-scope change is on the
§6 ALWAYS-ASK list — agents will file for it, you approve it in the App settings.

Separately, Sprint 1 also calls for a GitHub **OAuth app** (user login, W2-APP-1):
https://github.com/settings/applications/new — callback URL comes from W2-APP-1's packet.

## 5. Deterministic hooks — paste into `.claude/settings.json`

This is the PLAN.md §4.3 starter block. It fires regardless of what any agent intends
(P3: guardrails are mechanisms, not prompts). W1-PLAT-2 hardens and extends it; paste this
now so W1 runs with guardrails from the first packet.

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 -c \"import json,sys,re; d=json.load(sys.stdin); c=(d.get('tool_input') or {}).get('command','') or ''; bad=re.search(r'git\\s+push[^|;&]*\\s(--force|-f)\\b|rm\\s+-rf\\b|--no-verify\\b', c); sys.stderr.write('BLOCKED by PLAN.md 4.3 hook: force-push / rm -rf / --no-verify are forbidden\\n') if bad else None; sys.exit(2 if bad else 0)\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 -c \"import json,sys,re; d=json.load(sys.stdin); p=(d.get('tool_input') or {}).get('file_path',''); s=open(p,encoding='utf-8',errors='ignore').read() if p else ''; m=re.search(r'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|sk-ant-[A-Za-z0-9\\\\-]{20,}|xox[bap]-[A-Za-z0-9\\\\-]{10,}', s); sys.stderr.write('BLOCKED: possible credential in '+p+' (PLAN.md 6: never touch secrets)\\n') if m else None; sys.exit(2 if m else 0)\""
          }
        ]
      }
    ]
  }
}
```

Known gaps the starter block does NOT cover (W1-PLAT-2's packet closes them):
- Linter on touched files — the linter isn't chosen yet (ADR + G-DEP in W1-PLAT-2).
- "No network calls from sandbox test runs" — enforced at container level from W5-PLAT-1
  (egress-off sandbox), not in this shell hook.
- Exit code 2 blocks the action and feeds stderr back to the agent; test it by asking any
  agent to run `git push --force` against a scratch branch.

## 6. Multi-agent mode flag

When you're ready to run the full roster as Claude Code Agent Teams (PLAN.md §0 mode 1),
the flag is already in the settings block above:

```
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

(Alternatively export it in your shell before launching Claude Code. Docs:
code.claude.com/docs/en/agent-teams.) Until you enable it, ORCH runs mode 2:
single session + subagents — every packet prompt is self-contained for exactly
this reason.

## 7. Standing human duties (PLAN.md §8, for reference)

- Read one digest/day (~10 min) — `/digests/YYYY-MM-DD.md`.
- Approve/reject gated PRs from QA-CRITIC briefings; you are the only merger.
- Answer the ≤5 queued decisions per digest.
- Run wave-exit demos personally (`/demos/w*.md`).
- Talk to design partners — agents never represent Kyndro to a human customer.
