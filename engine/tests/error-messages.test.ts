import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../parser/index.js";
import { describeParseErrors, formatParseError } from "../parser/errors.js";

describe("BE-CORE charter: bad input produces a helpful, located message", () => {
  it("reports an unclosed brace with the correct line", async () => {
    const src = "function broken(a: number) {\n  return a;\n";
    const { tree, source } = await parseTypeScript(src);
    expect(tree.rootNode.hasError).toBe(true);
    const errors = describeParseErrors(tree, "broken.ts", source);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/broken\.ts:\d+:\d+/);
  });

  it("reports a stray token with a message naming the offending text", async () => {
    const src = "const x: = 5;";
    const { tree, source } = await parseTypeScript(src);
    expect(tree.rootNode.hasError).toBe(true);
    const errors = describeParseErrors(tree, "stray-token.ts", source);
    expect(errors.length).toBeGreaterThan(0);
    for (const e of errors) {
      expect(e.message).toContain("stray-token.ts");
    }
  });

  it("reports a mismatched parenthesis in a function signature", async () => {
    const src = "function f(a: number, b: string { return a; }";
    const { tree, source } = await parseTypeScript(src);
    expect(tree.rootNode.hasError).toBe(true);
    const errors = describeParseErrors(tree, "mismatched.ts", source);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].line).toBeGreaterThan(0);
    expect(errors[0].column).toBeGreaterThan(0);
  });

  it("formats a single parse error as a one-line, human-readable string", async () => {
    const src = "function broken( {\n";
    const { tree, source } = await parseTypeScript(src);
    const errors = describeParseErrors(tree, "one-liner.ts", source);
    expect(errors.length).toBeGreaterThan(0);
    const formatted = formatParseError(errors[0]);
    expect(formatted).toMatch(/^one-liner\.ts:\d+:\d+: /);
  });

  it("returns no errors for valid input (no false positives)", async () => {
    const { tree, source } = await parseTypeScript("function ok(a: number): number { return a; }");
    const errors = describeParseErrors(tree, "ok.ts", source);
    expect(errors).toHaveLength(0);
  });
});
