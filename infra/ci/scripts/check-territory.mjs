#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isPathOwnedBy } from "./territory-map.mjs";

export function resolveAgentForBranch(branch, tasksDir) {
  const files = readdirSync(tasksDir).filter((f) => f.endsWith(".yaml"));
  for (const file of files) {
    const content = readFileSync(join(tasksDir, file), "utf8");
    const branchMatch = content.match(/^branch:\s*(\S+)\s*$/m);
    const agentMatch = content.match(/^agent:\s*(\S+)\s*$/m);
    if (branchMatch && branchMatch[1] === branch && agentMatch) {
      return agentMatch[1];
    }
  }
  return null;
}

export function checkTerritory(agent, changedFiles) {
  const violations = changedFiles.filter((path) => !isPathOwnedBy(path, agent));
  if (violations.length > 0) {
    return {
      ok: false,
      message: `territory violation: ${agent} touched files outside its territory (PLAN.md §3):\n${violations
        .map((v) => `  - ${v}`)
        .join("\n")}`,
    };
  }
  return { ok: true, message: `all ${changedFiles.length} changed file(s) are within ${agent}'s territory` };
}

function main() {
  const base = process.argv[2] ?? "origin/main";
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const tasksDir = process.argv[3] ?? "tasks";
  const agent = resolveAgentForBranch(branch, tasksDir);
  if (!agent) {
    console.log(`no task packet found for branch "${branch}"; skipping territory check`);
    return;
  }
  const changedFiles = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const result = checkTerritory(agent, changedFiles);
  console.log(result.message);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
