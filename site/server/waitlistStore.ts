import { promises as fs } from "node:fs";
import path from "node:path";

export interface WaitlistEntry {
  email: string;
  created_at: string;
}

/** The "table": one JSON array on disk. See docs/adr/ADR-010-waitlist-storage.md. */
export async function readAll(filePath: string): Promise<WaitlistEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as WaitlistEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/** Idempotent on email (case-insensitive) so a double-submit isn't a duplicate row. */
export async function appendEntry(filePath: string, email: string): Promise<WaitlistEntry> {
  const entries = await readAll(filePath);
  const existing = entries.find((e) => e.email.toLowerCase() === email.toLowerCase());
  if (existing) return existing;

  const entry: WaitlistEntry = { email, created_at: new Date().toISOString() };
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify([...entries, entry], null, 2) + "\n", "utf-8");
  return entry;
}
