import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTelemetry } from "../index.js";
import { createLocalTransport, resolveLocalPath } from "../transports/local.js";

describe("resolveLocalPath", () => {
  it("interprets a file: DSN as a local path", () => {
    expect(resolveLocalPath("file:/tmp/foo.ndjson")).toBe("/tmp/foo.ndjson");
  });

  it("falls back to the default path when unset", () => {
    expect(resolveLocalPath(undefined)).toBe("infra/tmp/telemetry.ndjson");
  });

  it("falls back to the default path for a non-file: DSN (never a network call)", () => {
    expect(resolveLocalPath("https://vendor.example.com/dsn")).toBe("infra/tmp/telemetry.ndjson");
  });
});

describe("local telemetry transport, for both dev and staging configs", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kyndro-telemetry-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("captures a thrown error end-to-end (dev-style file: DSN)", async () => {
    const logPath = join(dir, "dev.ndjson");
    const telemetry = createTelemetry(createLocalTransport(`file:${logPath}`));

    try {
      throw new Error("boom");
    } catch (err) {
      await telemetry.captureError(err, { env: "dev" });
    }

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const event = JSON.parse(lines[0]);
    expect(event.message).toBe("boom");
    expect(event.level).toBe("error");
    expect(event.context.env).toBe("dev");
    expect(typeof event.context.stack).toBe("string");
  });

  it("captures a thrown error end-to-end (staging-style file: DSN)", async () => {
    const logPath = join(dir, "staging.ndjson");
    const telemetry = createTelemetry(createLocalTransport(`file:${logPath}`));

    await telemetry.captureError(new Error("staging failure"), { env: "staging" });

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    const event = JSON.parse(lines[0]);
    expect(event.message).toBe("staging failure");
    expect(event.context.env).toBe("staging");
  });

  it("appends multiple events on the same file across captures", async () => {
    const logPath = join(dir, "multi.ndjson");
    const telemetry = createTelemetry(createLocalTransport(`file:${logPath}`));

    await telemetry.capture({ message: "first", level: "info" });
    await telemetry.capture({ message: "second", level: "warning" });

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });
});
