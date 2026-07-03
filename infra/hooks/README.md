# Deterministic hooks (PLAN.md §4.3)

Hardened, file-based versions of the starter hooks pasted by HUMAN-SETUP.md
§5. These replace the inline `python3 -c "..."` one-liners with real,
unit-tested scripts (see `infra/ci/tests/hooks.test.ts`), and add the linter
step per ADR-013.

- `pre_tool_use_guard.py` — PreToolUse/Bash guard: blocks `git push --force`,
  `rm -rf`, `--no-verify`.
- `post_tool_use_scan.py` — PostToolUse/Edit|Write: blocks known credential
  patterns (hard fail), then runs ESLint if a config is discoverable for the
  touched file (soft-skips otherwise, per ADR-013).

Deliberately not implemented here: network-egress blocking. HUMAN-SETUP.md
§5 defers that to the W5-PLAT-1 egress-off sandbox container, not a shell
hook — this packet does not touch that.

## Human action required

This agent cannot write `.claude/settings.json` (it is protected agent
config — a Claude Code security control blocked the attempt in this
session). A human needs to update the block already pasted per
HUMAN-SETUP.md §5 to point at these scripts instead of the inline
one-liners:

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
            "command": "python3 \"$CLAUDE_PROJECT_DIR/infra/hooks/pre_tool_use_guard.py\""
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
            "command": "python3 \"$CLAUDE_PROJECT_DIR/infra/hooks/post_tool_use_scan.py\""
          }
        ]
      }
    ]
  }
}
```

Until a human pastes this, the inline starter block from HUMAN-SETUP.md §5
keeps running (secret scan only, no lint) — nothing regresses by these
scripts existing but not yet being wired in.
