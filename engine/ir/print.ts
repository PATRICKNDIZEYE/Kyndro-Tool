import type { FunctionInfo } from "./types.js";

function describeKind(fn: FunctionInfo): string {
  const parts: string[] = [];
  if (fn.isExported) parts.push(fn.isDefaultExport ? "export default" : "export");
  if (fn.isStatic) parts.push("static");
  if (fn.accessorKind) parts.push(fn.accessorKind);
  if (fn.isAsync) parts.push("async");
  if (fn.isGenerator) parts.push("generator");
  parts.push(fn.kind);
  return parts.join(" ");
}

function describeSignature(fn: FunctionInfo): string {
  const typeParams = fn.typeParameters.length > 0 ? `<${fn.typeParameters.join(", ")}>` : "";
  const params = fn.parameters
    .map((p) => `${p.isRest ? "..." : ""}${p.name}${p.optional ? "?" : ""}${p.typeAnnotation ? `: ${p.typeAnnotation}` : ""}`)
    .join(", ");
  const returnType = fn.returnType ? `: ${fn.returnType}` : "";
  return `${typeParams}(${params})${returnType}`;
}

/**
 * Render a flat, human-readable function inventory — one line per
 * function/method, in source order. This is the spike's "print" step:
 * parse, walk, print.
 */
export function formatFunctionInventory(functions: FunctionInfo[]): string {
  if (functions.length === 0) return "(no functions found)";

  return functions
    .map((fn) => {
      const qualifiedName = fn.className ? `${fn.className}.${fn.name}` : fn.name;
      const location = `${fn.span.filePath}:${fn.span.startLine}:${fn.span.startColumn}`;
      return `${location}  ${describeKind(fn)} ${qualifiedName}${describeSignature(fn)}`;
    })
    .join("\n");
}
