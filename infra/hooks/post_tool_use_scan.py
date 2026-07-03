#!/usr/bin/env python3
"""PostToolUse hook: secret scanner + best-effort linter (PLAN.md §4.3).

Hardened, file-based version of the starter secret-scan one-liner in
HUMAN-SETUP.md §5, extended with a linter step per ADR-013.

Reads the Claude Code hook JSON payload from stdin for an Edit/Write tool
call, inspects `tool_input.file_path`:

1. Secret scan (hard block, exit 2): same credential patterns as the
   starter block (AWS keys, PEM private keys, GitHub PATs, Anthropic keys,
   Slack tokens). PLAN.md §6: never touch secrets.
2. Lint (soft, per ADR-013): walks up from the file looking for an ESLint
   config. If none is found, logs a one-line skip and does not block —
   most packages in this repo don't have one yet. If a config is found and
   `npx eslint` reports errors, blocks (exit 2) and surfaces stderr.
"""
import json
import os
import re
import subprocess
import sys

SECRET_PATTERN = re.compile(
    r"AKIA[0-9A-Z]{16}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|ghp_[A-Za-z0-9]{36}"
    r"|github_pat_[A-Za-z0-9_]{22,}"
    r"|sk-ant-[A-Za-z0-9\-]{20,}"
    r"|xox[bap]-[A-Za-z0-9\-]{10,}"
)

ESLINT_CONFIG_NAMES = (
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
)


def scan_for_secrets(content: str):
    match = SECRET_PATTERN.search(content or "")
    return match is None


def find_eslint_config(start_dir: str, repo_root: str):
    current = os.path.abspath(start_dir)
    repo_root = os.path.abspath(repo_root)
    while True:
        for name in ESLINT_CONFIG_NAMES:
            candidate = os.path.join(current, name)
            if os.path.isfile(candidate):
                return candidate
        if current == repo_root or current == os.path.dirname(current):
            return None
        current = os.path.dirname(current)


def run_lint(file_path: str, repo_root: str):
    config = find_eslint_config(os.path.dirname(file_path), repo_root)
    if config is None:
        return True, f"no ESLint config found for {file_path}; skipping lint (ADR-013)"
    try:
        result = subprocess.run(
            ["npx", "--no-install", "eslint", file_path],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return True, f"eslint not runnable in this environment; skipping lint for {file_path}"
    if result.returncode != 0:
        return False, f"lint failed for {file_path}:\n{result.stdout}\n{result.stderr}"
    return True, f"lint passed for {file_path}"


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    file_path = (payload.get("tool_input") or {}).get("file_path", "") or ""
    if not file_path or not os.path.isfile(file_path):
        return 0

    with open(file_path, encoding="utf-8", errors="ignore") as f:
        content = f.read()

    secrets_ok = scan_for_secrets(content)
    if not secrets_ok:
        sys.stderr.write(
            f"BLOCKED: possible credential in {file_path} (PLAN.md §6: never touch secrets)\n"
        )
        return 2

    repo_root = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    lint_ok, lint_message = run_lint(file_path, repo_root)
    sys.stderr.write(lint_message + "\n")
    if not lint_ok:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
