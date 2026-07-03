import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const HOOKS_DIR = resolve(__dirname, "../../hooks");

function runHook(scriptName: string, payload: unknown) {
  const result = spawnSync("python3", [join(HOOKS_DIR, scriptName)], {
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  return result;
}

describe("pre_tool_use_guard.py", () => {
  it("allows an ordinary bash command", () => {
    const result = runHook("pre_tool_use_guard.py", {
      tool_input: { command: "git status --short" },
    });
    expect(result.status).toBe(0);
  });

  // Seeded violation fixture: force-push must be blocked (PLAN.md §6).
  it("blocks git push --force", () => {
    const result = runHook("pre_tool_use_guard.py", {
      tool_input: { command: "git push --force origin main" },
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("BLOCKED");
  });

  it("blocks rm -rf", () => {
    const result = runHook("pre_tool_use_guard.py", {
      tool_input: { command: "rm -rf /tmp/whatever" },
    });
    expect(result.status).toBe(2);
  });

  it("blocks --no-verify", () => {
    const result = runHook("pre_tool_use_guard.py", {
      tool_input: { command: "git commit --no-verify -m 'x'" },
    });
    expect(result.status).toBe(2);
  });
});

describe("post_tool_use_scan.py", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kyndro-hook-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("allows a file with no secrets and no eslint config nearby", () => {
    const file = join(dir, "clean.ts");
    writeFileSync(file, "export const x = 1;\n");
    const result = runHook("post_tool_use_scan.py", {
      tool_input: { file_path: file },
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("skipping lint");
  });

  // Seeded violation fixture: a fake GitHub PAT must be caught, mirroring
  // the pattern already proven against real fixtures in HUMAN-SETUP.md §5.
  it("blocks a file containing a fake GitHub PAT", () => {
    const file = join(dir, "leaky.ts");
    writeFileSync(file, `const token = "ghp_${"a".repeat(36)}";\n`);
    const result = runHook("post_tool_use_scan.py", {
      tool_input: { file_path: file },
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("BLOCKED");
  });

  it("blocks a file containing a PEM private key header", () => {
    const file = join(dir, "key.pem");
    writeFileSync(file, "-----BEGIN RSA PRIVATE KEY-----\nMIIB...\n");
    const result = runHook("post_tool_use_scan.py", {
      tool_input: { file_path: file },
    });
    expect(result.status).toBe(2);
  });

  it("discovers an ESLint config in a parent directory (config-discovery logic, ADR-013)", () => {
    const pkgDir = join(dir, "pkg");
    const srcDir = join(pkgDir, "src");
    writeFileSync(join(dir, ".marker"), "repo-root-marker\n");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(pkgDir, "eslint.config.mjs"), "export default [];\n");
    const found = spawnSync(
      "python3",
      [
        "-c",
        `import sys; sys.path.insert(0, ${JSON.stringify(HOOKS_DIR)}); import post_tool_use_scan as m; print(m.find_eslint_config(${JSON.stringify(srcDir)}, ${JSON.stringify(dir)}))`,
      ],
      { encoding: "utf8" },
    );
    expect(found.stdout.trim()).toBe(join(pkgDir, "eslint.config.mjs"));
  });
});
