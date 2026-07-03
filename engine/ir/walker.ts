import type Parser from "web-tree-sitter";
import type { FunctionInfo, FunctionKind, FunctionParameter } from "./types.js";

type SyntaxNode = Parser.SyntaxNode;

const FUNCTION_LIKE_TYPES = new Set([
  "function_declaration",
  "generator_function_declaration",
  "function_expression",
  "generator_function_expression",
  "arrow_function",
  "method_definition",
]);

// Node types that forward their export/default context straight through to
// their children without themselves being a function or resetting context
// (e.g. `export const foo = () => {}` — the arrow_function two levels down
// is the thing that's actually exported).
const TRANSPARENT_WRAPPER_TYPES = new Set([
  "lexical_declaration",
  "variable_declaration",
  "variable_declarator",
]);

interface WalkContext {
  isExportedHere: boolean;
  isDefaultHere: boolean;
  currentClassName?: string;
}

const ROOT_CONTEXT: WalkContext = { isExportedHere: false, isDefaultHere: false };

function anonChildOfType(node: SyntaxNode, type: string): boolean {
  return node.children.some((c) => !c.isNamed && c.type === type);
}

function childContextFor(node: SyntaxNode, ctx: WalkContext): WalkContext {
  if (node.type === "export_statement") {
    return {
      isExportedHere: true,
      isDefaultHere: anonChildOfType(node, "default"),
      currentClassName: ctx.currentClassName,
    };
  }
  if (TRANSPARENT_WRAPPER_TYPES.has(node.type)) {
    return ctx;
  }
  if (node.type === "class_declaration" || node.type === "class_expression") {
    return {
      isExportedHere: false,
      isDefaultHere: false,
      currentClassName: node.childForFieldName("name")?.text,
    };
  }
  if (node.type === "class_body") {
    return { isExportedHere: false, isDefaultHere: false, currentClassName: ctx.currentClassName };
  }
  // Any other node (statement blocks, function bodies, control flow, ...)
  // resets both export and class context — only the direct exported
  // declaration and direct class members inherit it.
  return { isExportedHere: false, isDefaultHere: false, currentClassName: undefined };
}

function resolveNameAndAnonymity(
  node: SyntaxNode,
  ctx: WalkContext,
): { name: string; isAnonymous: boolean } {
  if (node.type === "method_definition") {
    const nameNode = node.childForFieldName("name");
    return { name: nameNode?.text ?? "<computed>", isAnonymous: !nameNode };
  }

  const nameField = node.childForFieldName("name")?.text;
  if (nameField) {
    return { name: nameField, isAnonymous: false };
  }

  const parent = node.parent;
  if (parent?.type === "variable_declarator") {
    const name = parent.childForFieldName("name")?.text;
    if (name) return { name, isAnonymous: false };
  }
  if (parent?.type === "assignment_expression") {
    const left = parent.childForFieldName("left")?.text;
    if (left) return { name: left, isAnonymous: false };
  }

  if (ctx.isDefaultHere) {
    return { name: "default", isAnonymous: true };
  }
  return { name: "<anonymous>", isAnonymous: true };
}

function kindFor(node: SyntaxNode): FunctionKind {
  if (node.type === "method_definition") return "method";
  if (node.type === "arrow_function") return "arrow";
  return "function";
}

function stripLeadingColon(text: string | undefined): string | undefined {
  return text?.replace(/^:\s*/, "");
}

function extractTypeParameters(node: SyntaxNode): string[] {
  const typeParams = node.childForFieldName("type_parameters");
  if (!typeParams) return [];
  return typeParams.namedChildren
    .filter((c) => c.type === "type_parameter")
    .map((c) => c.text);
}

function extractParameters(node: SyntaxNode): FunctionParameter[] {
  const formalParams = node.childForFieldName("parameters");
  if (!formalParams) return [];

  return formalParams.namedChildren.map((p): FunctionParameter => {
    if (p.type === "required_parameter" || p.type === "optional_parameter") {
      const pattern = p.childForFieldName("pattern");
      const isRest = pattern?.type === "rest_pattern";
      return {
        name: pattern?.text ?? p.text,
        typeAnnotation: stripLeadingColon(p.childForFieldName("type")?.text),
        optional: p.type === "optional_parameter",
        hasDefault: p.childForFieldName("value") != null,
        isRest,
      };
    }
    // Fallback for parameter shapes we haven't special-cased (e.g. a bare
    // destructuring pattern with no type/default): capture the raw text so
    // nothing silently disappears from the inventory.
    return {
      name: p.text,
      typeAnnotation: undefined,
      optional: false,
      hasDefault: false,
      isRest: p.type === "rest_pattern",
    };
  });
}

function buildFunctionInfo(node: SyntaxNode, ctx: WalkContext, filePath: string): FunctionInfo {
  const { name, isAnonymous } = resolveNameAndAnonymity(node, ctx);
  const kind = kindFor(node);
  const isMethod = kind === "method";

  return {
    name,
    isAnonymous,
    kind,
    isAsync: anonChildOfType(node, "async"),
    isGenerator: node.type.startsWith("generator_") || anonChildOfType(node, "*"),
    isExported: ctx.isExportedHere,
    isDefaultExport: ctx.isDefaultHere,
    className: isMethod ? ctx.currentClassName : undefined,
    isStatic: isMethod ? anonChildOfType(node, "static") : undefined,
    accessorKind: isMethod
      ? anonChildOfType(node, "get")
        ? "get"
        : anonChildOfType(node, "set")
          ? "set"
          : undefined
      : undefined,
    typeParameters: extractTypeParameters(node),
    parameters: extractParameters(node),
    returnType: stripLeadingColon(node.childForFieldName("return_type")?.text),
    span: {
      filePath,
      startLine: node.startPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    },
  };
}

function walk(node: SyntaxNode, ctx: WalkContext, filePath: string, out: FunctionInfo[]): void {
  if (FUNCTION_LIKE_TYPES.has(node.type)) {
    out.push(buildFunctionInfo(node, ctx, filePath));
  }
  const childCtx = childContextFor(node, ctx);
  for (const child of node.children) {
    walk(child, childCtx, filePath, out);
  }
}

/**
 * Walk a parsed tree-sitter TypeScript tree and produce a flat inventory of
 * every function declaration, function expression, arrow function, and
 * class method, in source order.
 */
export function buildFunctionInventory(tree: Parser.Tree, filePath: string): FunctionInfo[] {
  const out: FunctionInfo[] = [];
  walk(tree.rootNode, ROOT_CONTEXT, filePath, out);
  return out;
}
