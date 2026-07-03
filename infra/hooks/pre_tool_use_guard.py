#!/usr/bin/env python3
"""PreToolUse hook: blocks forbidden Bash commands (PLAN.md §4.3 / §6).

Hardened, file-based version of the inline one-liner pasted in
HUMAN-SETUP.md §5. Reads the Claude Code hook JSON payload from stdin,
inspects `tool_input.command` for a Bash tool call, and exits 2 (blocking)
with a stderr message if the command matches a forbidden pattern. Exits 0
(allow) otherwise.

Forbidden patterns, unchanged from the starter block:
- `git push --force` / `git push -f` (any form, PLAN.md §6: never force-push)
- `rm -rf` (PLAN.md §6: no destructive recursive deletes)
- `--no-verify` (PLAN.md §6: never skip hooks)

Deliberately NOT covered here (see ADR-011 / HUMAN-SETUP.md §5 "known gaps"):
network-egress blocking is a container-level concern for W5-PLAT-1's
egress-off sandbox, not a shell-level guard.
"""
import json
import re
import sys

FORBIDDEN_COMMAND_PATTERN = re.compile(
    r"git\s+push[^|;&]*\s(--force|-f)\b|rm\s+-rf\b|--no-verify\b"
)


def check_command(command: str):
    match = FORBIDDEN_COMMAND_PATTERN.search(command or "")
    if match:
        return (
            False,
            "BLOCKED by PLAN.md §4.3/§6 hook: force-push / rm -rf / "
            "--no-verify are forbidden",
        )
    return True, ""


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    command = (payload.get("tool_input") or {}).get("command", "") or ""
    ok, message = check_command(command)
    if not ok:
        sys.stderr.write(message + "\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
