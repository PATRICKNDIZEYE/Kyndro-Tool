import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEntry, readAll } from "../server/waitlistStore";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "kyndro-waitlist-"));
  file = path.join(dir, "waitlist.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("waitlistStore", () => {
  it("returns an empty table before any writes", async () => {
    expect(await readAll(file)).toEqual([]);
  });

  it("persists a submitted email to the table", async () => {
    const entry = await appendEntry(file, "person@example.com");
    expect(entry.email).toBe("person@example.com");
    expect(entry.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const all = await readAll(file);
    expect(all).toHaveLength(1);
    expect(all[0].email).toBe("person@example.com");
  });

  it("does not create a duplicate row for a repeat (case-insensitive) submission", async () => {
    await appendEntry(file, "person@example.com");
    await appendEntry(file, "Person@Example.com");

    const all = await readAll(file);
    expect(all).toHaveLength(1);
  });

  it("appends multiple distinct emails", async () => {
    await appendEntry(file, "a@example.com");
    await appendEntry(file, "b@example.com");

    const all = await readAll(file);
    expect(all.map((e) => e.email).sort()).toEqual(["a@example.com", "b@example.com"]);
  });
});
