import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../parser/index.js";

describe("parseTypeScript smoke test", () => {
  it("parses a trivial function with no errors", async () => {
    const { tree } = await parseTypeScript("function add(a: number, b: number): number { return a + b; }");
    expect(tree.rootNode.hasError).toBe(false);
    expect(tree.rootNode.type).toBe("program");
  });
});
