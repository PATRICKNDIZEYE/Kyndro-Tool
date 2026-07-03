import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../parser/index.js";
import { buildFunctionInventory } from "../ir/walker.js";
import { formatFunctionInventory } from "../ir/print.js";
import type { FunctionInfo } from "../ir/types.js";

const FIXTURE_REPO_DIR = join(__dirname, "../../fixtures/sample-repo/src");

async function buildFixtureRepoInventory(): Promise<FunctionInfo[]> {
  const files = readdirSync(FIXTURE_REPO_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort();

  const all: FunctionInfo[] = [];
  for (const file of files) {
    const fullPath = join(FIXTURE_REPO_DIR, file);
    const source = readFileSync(fullPath, "utf8");
    const { tree } = await parseTypeScript(source);
    const relPath = relative(join(__dirname, "../.."), fullPath);
    all.push(...buildFunctionInventory(tree, relPath));
  }
  return all;
}

describe("W1-CORE-1 acceptance: parses the /fixtures/ sample repo end to end", () => {
  it("parses every file with zero syntax errors", async () => {
    const files = readdirSync(FIXTURE_REPO_DIR).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
      const source = readFileSync(join(FIXTURE_REPO_DIR, file), "utf8");
      const { tree } = await parseTypeScript(source);
      expect(tree.rootNode.hasError, `${file} should parse without error`).toBe(false);
    }
  });

  it("builds a non-empty function inventory covering every fixture file with functions", async () => {
    const fns = await buildFixtureRepoInventory();
    expect(fns.length).toBeGreaterThan(10);
    const filesRepresented = new Set(fns.map((f) => f.span.filePath));
    // index.ts is barrel re-exports only (no function bodies) — every other
    // fixture file should contribute at least one function to the inventory.
    const filesWithFunctionsExpected = readdirSync(FIXTURE_REPO_DIR).filter(
      (f) => f.endsWith(".ts") && f !== "index.ts",
    ).length;
    expect(filesRepresented.size).toBe(filesWithFunctionsExpected);
  });

  it("finds Cart's methods qualified by class name (cart.ts)", async () => {
    const fns = await buildFixtureRepoInventory();
    const cartMethods = fns.filter((f) => f.className === "Cart").map((f) => f.name);
    expect(cartMethods).toEqual(
      expect.arrayContaining(["addItem", "removeItem", "lineCount", "subtotalCents", "toLines"]),
    );
  });

  it("finds the exported async checkout function (checkout.ts)", async () => {
    const fns = await buildFixtureRepoInventory();
    const checkout = fns.find((f) => f.name === "checkout");
    expect(checkout).toBeDefined();
    expect(checkout!.isAsync).toBe(true);
    expect(checkout!.isExported).toBe(true);
  });

  it("finds the generic ok/err functions (types.ts)", async () => {
    const fns = await buildFixtureRepoInventory();
    const ok = fns.find((f) => f.name === "ok");
    const err = fns.find((f) => f.name === "err");
    expect(ok?.typeParameters).toEqual(["T", "E"]);
    expect(err?.typeParameters).toEqual(["T", "E"]);
  });

  it("finds arrow-function-as-const exports (inventory.ts's seedStock/reserveStock)", async () => {
    const fns = await buildFixtureRepoInventory();
    const seedStock = fns.find((f) => f.name === "seedStock");
    const reserveStock = fns.find((f) => f.name === "reserveStock");
    expect(seedStock?.kind).toBe("arrow");
    expect(seedStock?.isExported).toBe(true);
    expect(reserveStock?.kind).toBe("arrow");
    expect(reserveStock?.isAsync).toBe(true);
  });

  it("prints a non-empty, stable function inventory (parse -> walk -> print)", async () => {
    const fns = await buildFixtureRepoInventory();
    const printed = formatFunctionInventory(fns);
    expect(printed.length).toBeGreaterThan(0);
    expect(printed).toContain("Cart.addItem");
    expect(printed.split("\n").length).toBe(fns.length);
  });
});
