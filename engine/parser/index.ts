import { createRequire } from "node:module";
import Parser from "web-tree-sitter";

const require = createRequire(import.meta.url);

// tree-sitter-typescript ships two grammars in one wasm-producing package:
// "typescript" (.ts) and "tsx" (.tsx). We spike on plain TypeScript only —
// PLAN.md §5's scope for this packet is TypeScript, not TSX/JSX.
const TS_WASM_PATH = require.resolve("tree-sitter-typescript/tree-sitter-typescript.wasm");

let tsLanguage: Parser.Language | undefined;

async function getTypeScriptLanguage(): Promise<Parser.Language> {
  if (!tsLanguage) {
    await Parser.init();
    tsLanguage = await Parser.Language.load(TS_WASM_PATH);
  }
  return tsLanguage;
}

export interface ParseResult {
  tree: Parser.Tree;
  source: string;
}

/**
 * Parse a TypeScript source string into a tree-sitter concrete syntax tree.
 * Per ADR-014: web-tree-sitter (WASM), no native compilation required.
 */
export async function parseTypeScript(source: string): Promise<ParseResult> {
  const language = await getTypeScriptLanguage();
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  return { tree, source };
}

export type { Parser };
