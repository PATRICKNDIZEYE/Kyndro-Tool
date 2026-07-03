import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../parser/index.js";
import { buildFunctionInventory } from "../ir/walker.js";
import type { FunctionInfo } from "../ir/types.js";

const FILE = "golden.ts";

async function inventory(src: string): Promise<FunctionInfo[]> {
  const { tree } = await parseTypeScript(src);
  return buildFunctionInventory(tree, FILE);
}

async function single(src: string): Promise<FunctionInfo> {
  const fns = await inventory(src);
  expect(fns).toHaveLength(1);
  return fns[0];
}

describe("walker golden tests: plain functions", () => {
  it("finds a plain function declaration", async () => {
    const fn = await single("function add(a: number, b: number): number { return a + b; }");
    expect(fn.name).toBe("add");
    expect(fn.kind).toBe("function");
    expect(fn.isExported).toBe(false);
  });

  it("finds an exported function declaration", async () => {
    const fn = await single("export function add(a: number): number { return a; }");
    expect(fn.isExported).toBe(true);
    expect(fn.isDefaultExport).toBe(false);
  });

  it("finds a named default-exported function declaration", async () => {
    const fn = await single("export default function named(x: string) { return x; }");
    expect(fn.name).toBe("named");
    expect(fn.isExported).toBe(true);
    expect(fn.isDefaultExport).toBe(true);
    expect(fn.isAnonymous).toBe(false);
  });

  it("finds an anonymous default-exported function expression", async () => {
    const fn = await single("export default function (x: string) { return x; }");
    expect(fn.name).toBe("default");
    expect(fn.isAnonymous).toBe(true);
    expect(fn.isDefaultExport).toBe(true);
  });

  it("resolves the span to the correct source location", async () => {
    const fn = await single("\n\nfunction f() {}\n");
    expect(fn.span.startLine).toBe(3);
    expect(fn.span.filePath).toBe(FILE);
  });

  it("does not mark a nested, non-exported function as exported", async () => {
    const fns = await inventory("export function outer() { function inner() {} return inner; }");
    expect(fns).toHaveLength(2);
    const outer = fns.find((f) => f.name === "outer")!;
    const inner = fns.find((f) => f.name === "inner")!;
    expect(outer.isExported).toBe(true);
    expect(inner.isExported).toBe(false);
  });
});

describe("walker golden tests: async and generator functions", () => {
  it("marks an async function declaration", async () => {
    const fn = await single("async function fetchData(): Promise<void> {}");
    expect(fn.isAsync).toBe(true);
    expect(fn.isGenerator).toBe(false);
  });

  it("marks a generator function declaration", async () => {
    const fn = await single("function* gen() { yield 1; }");
    expect(fn.isGenerator).toBe(true);
    expect(fn.isAsync).toBe(false);
  });

  it("marks an async generator function declaration", async () => {
    const fn = await single("async function* asyncGen() {}");
    expect(fn.isAsync).toBe(true);
    expect(fn.isGenerator).toBe(true);
  });
});

describe("walker golden tests: arrow functions", () => {
  it("resolves an arrow function's name from its variable declarator", async () => {
    const fn = await single("const double = (x: number): number => x * 2;");
    expect(fn.name).toBe("double");
    expect(fn.kind).toBe("arrow");
  });

  it("marks an exported arrow function", async () => {
    const fn = await single("export const triple = (x: number) => x * 3;");
    expect(fn.isExported).toBe(true);
    expect(fn.name).toBe("triple");
  });

  it("marks a default-exported anonymous arrow function", async () => {
    const fn = await single("export default (x: number) => x + 1;");
    expect(fn.isDefaultExport).toBe(true);
    expect(fn.isAnonymous).toBe(true);
    expect(fn.name).toBe("default");
  });

  it("marks an async arrow function", async () => {
    const fn = await single("const load = async () => { return 1; };");
    expect(fn.isAsync).toBe(true);
    expect(fn.kind).toBe("arrow");
  });

  it("treats a fully anonymous, unassigned arrow function as anonymous", async () => {
    const fns = await inventory("[1, 2, 3].map((x) => x + 1);");
    expect(fns).toHaveLength(1);
    expect(fns[0].isAnonymous).toBe(true);
    expect(fns[0].name).toBe("<anonymous>");
  });
});

describe("walker golden tests: class methods", () => {
  it("qualifies a plain method with its class name", async () => {
    const fn = await single("class Cart { addItem(id: string): void {} }");
    expect(fn.kind).toBe("method");
    expect(fn.name).toBe("addItem");
    expect(fn.className).toBe("Cart");
  });

  it("marks a static method", async () => {
    const fn = await single("class Factory { static create(): Factory { return new Factory(); } }");
    expect(fn.isStatic).toBe(true);
  });

  it("marks an async method", async () => {
    const fn = await single("class Repo { async save(): Promise<void> {} }");
    expect(fn.isAsync).toBe(true);
  });

  it("marks a generator method", async () => {
    const fn = await single("class Iter { *values() { yield 1; } }");
    expect(fn.isGenerator).toBe(true);
  });

  it("marks a getter accessor", async () => {
    const fn = await single("class Box { get value(): number { return 1; } }");
    expect(fn.accessorKind).toBe("get");
  });

  it("marks a setter accessor", async () => {
    const fn = await single("class Box { set value(v: number) {} }");
    expect(fn.accessorKind).toBe("set");
  });

  it("does not mark a class's methods as exported just because the class is exported", async () => {
    const fn = await single("export class Cart { addItem(): void {} }");
    expect(fn.isExported).toBe(false);
  });
});

describe("walker golden tests: generics", () => {
  it("extracts a single type parameter from a generic function", async () => {
    const fn = await single("function identity<T>(x: T): T { return x; }");
    expect(fn.typeParameters).toEqual(["T"]);
    expect(fn.returnType).toBe("T");
  });

  it("extracts multiple constrained type parameters", async () => {
    const fn = await single("function pair<T, U extends string>(a: T, b: U): [T, U] { return [a, b]; }");
    expect(fn.typeParameters).toHaveLength(2);
    expect(fn.typeParameters[1]).toContain("U extends string");
  });

  it("extracts type parameters from a generic arrow function", async () => {
    const fn = await single("const wrap = <T,>(x: T): T[] => [x];");
    expect(fn.typeParameters).toEqual(["T"]);
  });
});

describe("walker golden tests: parameters", () => {
  it("distinguishes required, optional, defaulted, and rest parameters", async () => {
    const fn = await single(
      "function f(a: number, b?: string, c: number = 5, ...rest: number[]) {}",
    );
    expect(fn.parameters).toHaveLength(4);
    expect(fn.parameters[0]).toMatchObject({ name: "a", optional: false, hasDefault: false, isRest: false });
    expect(fn.parameters[1]).toMatchObject({ name: "b", optional: true, hasDefault: false });
    expect(fn.parameters[2]).toMatchObject({ name: "c", hasDefault: true });
    expect(fn.parameters[3]).toMatchObject({ isRest: true });
  });
});

describe("walker golden tests: whole-file inventory ordering", () => {
  it("lists functions in source order across mixed constructs", async () => {
    const fns = await inventory(`
      function first() {}
      const second = () => {};
      class C { third() {} }
    `);
    expect(fns.map((f) => f.name)).toEqual(["first", "second", "third"]);
  });
});
