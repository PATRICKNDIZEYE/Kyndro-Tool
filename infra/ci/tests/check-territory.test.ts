import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkTerritory, resolveAgentForBranch } from "../scripts/check-territory.mjs";
import { isPathOwnedBy } from "../scripts/territory-map.mjs";

describe("isPathOwnedBy", () => {
  it("lets FE-APP touch its own screens", () => {
    expect(isPathOwnedBy("app/screens/RunList/RunList.tsx", "FE-APP")).toBe(true);
  });

  // Seeded violation fixture: /app/design-system/ is carved out of FE-APP's
  // /app/ territory and belongs to FE-SYS (PLAN.md §3).
  it("does not let FE-APP touch app/design-system/", () => {
    expect(isPathOwnedBy("app/design-system/tokens/tokens.css", "FE-APP")).toBe(false);
  });

  it("lets FE-SYS touch app/design-system/", () => {
    expect(isPathOwnedBy("app/design-system/tokens/tokens.css", "FE-SYS")).toBe(true);
  });

  it("lets BE-CORE touch engine/ and cli/ but not cli/ux/", () => {
    expect(isPathOwnedBy("engine/parser/index.ts", "BE-CORE")).toBe(true);
    expect(isPathOwnedBy("cli/run.ts", "BE-CORE")).toBe(true);
    expect(isPathOwnedBy("cli/ux/formatting.ts", "BE-CORE")).toBe(false);
  });

  it("lets any agent touch shared paths (docs/adr, tasks, fixtures, digests)", () => {
    expect(isPathOwnedBy("docs/adr/ADR-011-ci-cd-toolchain.md", "FE-APP")).toBe(true);
    expect(isPathOwnedBy("tasks/W1-APP-1.yaml", "BE-PLAT")).toBe(true);
    expect(isPathOwnedBy("digests/2026-07-03.md", "BE-PLAT")).toBe(true);
  });

  it("does not treat reviews/ as shared (QA-CRITIC/SEC-REV-owned, read-only for others)", () => {
    expect(isPathOwnedBy("reviews/sec/findings.md", "BE-PLAT")).toBe(false);
  });

  it("lets any agent touch root shared config/doc files", () => {
    expect(isPathOwnedBy("HUMAN-SETUP.md", "BE-PLAT")).toBe(true);
    expect(isPathOwnedBy("pnpm-workspace.yaml", "FE-SYS")).toBe(true);
  });
});

describe("checkTerritory", () => {
  it("passes when every changed file is owned by the agent", () => {
    const result = checkTerritory("BE-PLAT", ["infra/ci/pipeline.yml", "platform/telemetry/index.ts"]);
    expect(result.ok).toBe(true);
  });

  // Seeded violation fixture: a cross-territory diff (BE-PLAT reaching into
  // /engine/, which is BE-CORE's territory) must be rejected.
  it("fails when a changed file is outside the agent's territory", () => {
    const result = checkTerritory("BE-PLAT", ["infra/ci/pipeline.yml", "engine/parser/index.ts"]);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("engine/parser/index.ts");
  });
});

describe("resolveAgentForBranch", () => {
  let tasksDir: string;

  beforeEach(() => {
    tasksDir = mkdtempSync(join(tmpdir(), "kyndro-tasks-"));
    writeFileSync(
      join(tasksDir, "W1-PLAT-2.yaml"),
      "id: W1-PLAT-2\nwave: W1\nagent: BE-PLAT\nbranch: w1/be-plat-ci-envs\n",
    );
  });

  afterEach(() => {
    rmSync(tasksDir, { recursive: true, force: true });
  });

  it("finds the agent for a known branch", () => {
    expect(resolveAgentForBranch("w1/be-plat-ci-envs", tasksDir)).toBe("BE-PLAT");
  });

  it("returns null for an unknown branch", () => {
    expect(resolveAgentForBranch("some/other-branch", tasksDir)).toBeNull();
  });
});
