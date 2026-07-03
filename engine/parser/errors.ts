import type Parser from "web-tree-sitter";

type SyntaxNode = Parser.SyntaxNode;

export interface ParseError {
  filePath: string;
  line: number;
  column: number;
  /** Fully formatted, human-readable "file:line:col: reason" — see formatParseError. */
  message: string;
}

function snippet(text: string, max = 40): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "(empty)";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/**
 * Walk a tree-sitter tree and collect every syntax error / missing-token
 * node into a helpful, located message. Per the BE-CORE charter: bad input
 * must produce a message naming the location of the problem, not a bare
 * stack trace or a silent wrong parse.
 */
export function describeParseErrors(tree: Parser.Tree, filePath: string, _source: string): ParseError[] {
  const out: ParseError[] = [];

  function visit(node: SyntaxNode): void {
    const line = node.startPosition.row + 1;
    const column = node.startPosition.column + 1;
    const location = `${filePath}:${line}:${column}`;

    if (node.isMissing) {
      out.push({
        filePath,
        line,
        column,
        message: `${location}: parse error: expected a "${node.type}" here, but it was missing`,
      });
    } else if (node.type === "ERROR") {
      out.push({
        filePath,
        line,
        column,
        message: `${location}: parse error: unexpected syntax near "${snippet(node.text)}"`,
      });
    }

    for (const child of node.children) {
      visit(child);
    }
  }

  visit(tree.rootNode);
  return out;
}

/**
 * Stable formatting entrypoint for a ParseError. Callers should prefer this
 * over reading `.message` directly so the format can evolve in one place.
 */
export function formatParseError(error: ParseError): string {
  return error.message;
}
