import { describe, expect, it } from "vitest";
import { checkPrSize, parseDiffStat } from "../scripts/check-pr-size.mjs";

describe("parseDiffStat", () => {
  it("sums added and removed lines across files", () => {
    const numstat = "10\t2\tfoo.ts\n5\t0\tbar.ts\n0\t3\tbaz.ts\n";
    expect(parseDiffStat(numstat)).toBe(20);
  });

  it("ignores binary files marked with '-'", () => {
    const numstat = "10\t2\tfoo.ts\n-\t-\timage.png\n";
    expect(parseDiffStat(numstat)).toBe(12);
  });

  it("returns 0 for an empty diff", () => {
    expect(parseDiffStat("")).toBe(0);
  });
});

describe("checkPrSize", () => {
  it("passes a diff under the 400-line cap", () => {
    const result = checkPrSize(399);
    expect(result.ok).toBe(true);
  });

  it("passes a diff exactly at the cap", () => {
    const result = checkPrSize(400);
    expect(result.ok).toBe(true);
  });

  // Seeded violation fixture: a diff one line over the cap must fail with
  // the exact "split this packet" wording PLAN.md §6 / §4.3 requires.
  it("fails a diff one line over the cap", () => {
    const result = checkPrSize(401);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("split this packet");
  });

  // Seeded violation fixture: reproduces the real W1-APP-1 packet, whose
  // from-scratch scaffold diff (~1314 lines) was flagged this session as
  // exceeding the cap.
  it("fails a large from-scratch scaffold diff like W1-APP-1's", () => {
    const result = checkPrSize(1314);
    expect(result.ok).toBe(false);
  });
});
