#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const MAX_CHANGED_LINES = 400;

export function parseDiffStat(numstatOutput) {
  let total = 0;
  for (const line of numstatOutput.split("\n")) {
    if (!line.trim()) continue;
    const [added, removed] = line.split("\t");
    const a = added === "-" ? 0 : Number.parseInt(added, 10);
    const r = removed === "-" ? 0 : Number.parseInt(removed, 10);
    total += (Number.isNaN(a) ? 0 : a) + (Number.isNaN(r) ? 0 : r);
  }
  return total;
}

export function checkPrSize(totalChangedLines, max = MAX_CHANGED_LINES) {
  if (totalChangedLines > max) {
    return {
      ok: false,
      message: `split this packet: ${totalChangedLines} changed lines exceeds the ${max}-line PR cap (PLAN.md §6)`,
    };
  }
  return { ok: true, message: `${totalChangedLines} changed lines (limit ${max})` };
}

function main() {
  const base = process.argv[2] ?? "origin/main";
  const numstat = execFileSync("git", ["diff", "--numstat", `${base}...HEAD`], {
    encoding: "utf8",
  });
  const total = parseDiffStat(numstat);
  const result = checkPrSize(total);
  console.log(result.message);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
