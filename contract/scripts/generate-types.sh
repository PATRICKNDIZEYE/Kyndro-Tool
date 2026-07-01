#!/usr/bin/env bash
# Generate @kyndro/types from the OpenAPI contract (toolchain: ADR-007).
# Deterministic: same openapi.yaml + same pinned tool version => byte-identical output.
# Usage (from anywhere): contract/scripts/generate-types.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEC="$REPO_ROOT/contract/openapi.yaml"
OUT="$REPO_ROOT/contract/types/index.d.ts"

# Pinned exactly — do not float. Bumping the version is a contract-change task.
OPENAPI_TYPESCRIPT_VERSION="7.4.4"

npx --yes "openapi-typescript@${OPENAPI_TYPESCRIPT_VERSION}" "$SPEC" --output "$OUT"

echo "Generated $OUT"
