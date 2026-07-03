export interface SourceSpan {
  filePath: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startIndex: number;
  endIndex: number;
}

export type FunctionKind = "function" | "arrow" | "method";

export interface FunctionParameter {
  name: string;
  typeAnnotation?: string;
  optional: boolean;
  hasDefault: boolean;
  isRest: boolean;
}

export interface FunctionInfo {
  name: string;
  isAnonymous: boolean;
  kind: FunctionKind;
  isAsync: boolean;
  isGenerator: boolean;
  isExported: boolean;
  isDefaultExport: boolean;
  className?: string;
  isStatic?: boolean;
  accessorKind?: "get" | "set";
  typeParameters: string[];
  parameters: FunctionParameter[];
  returnType?: string;
  span: SourceSpan;
}
