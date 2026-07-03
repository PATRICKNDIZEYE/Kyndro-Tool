import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { TelemetryEvent, Transport } from "../index.js";

const DEFAULT_LOCAL_PATH = "infra/tmp/telemetry.ndjson";

// Per ADR-012: never makes a network call. Resolves ERROR_TRACKING_DSN as a
// local file path only (a "file:" prefix, or falls back to a repo-relative
// default) until a human accepts a real vendor and a second Transport is
// written for it.
export function resolveLocalPath(dsn: string | undefined): string {
  if (!dsn) return DEFAULT_LOCAL_PATH;
  if (dsn.startsWith("file:")) return dsn.slice("file:".length);
  return DEFAULT_LOCAL_PATH;
}

export function createLocalTransport(dsn: string | undefined = process.env.ERROR_TRACKING_DSN): Transport {
  const filePath = resolveLocalPath(dsn);

  return {
    async capture(event: TelemetryEvent) {
      await mkdir(dirname(filePath), { recursive: true });
      await appendFile(filePath, JSON.stringify(event) + "\n", "utf8");
    },
  };
}
