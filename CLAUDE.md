# Kyndro — agent rules
PLAN.md is canonical. Territory map: PLAN.md §3 (one agent = one directory tree = one branch = one PR). Packet workflow: PLAN.md §4 (all work is assigned via YAML packets in /tasks/ — no packet, no work).
NEVER (enforced by mechanism — PLAN.md §6):
- merge to `main` (branch protection: humans only)
- deploy/publish (G-PUB)
- touch secrets/`.env`/keys (hook-blocked + scanner)
- disable or skip a failing test
- edit another agent's territory (CI territory check)
- exceed 400 changed lines per PR (CI)
- make network calls from the verification sandbox (egress-off container)
