import styles from "./DiffViewerShell.module.css";

export interface DiffLine {
  type: "added" | "removed" | "context";
  lineNumber: number;
  content: string;
}

export interface DiffViewerShellProps {
  filePath: string;
  lines: DiffLine[];
}

const lineClass: Record<DiffLine["type"], string> = {
  added: styles.added,
  removed: styles.removed,
  context: styles.context,
};

const linePrefix: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "-",
  context: " ",
};

/** Shell only — this packet ships the visual frame; the real semantic diff (W3) fills it in. */
export function DiffViewerShell({ filePath, lines }: DiffViewerShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.header}>{filePath}</div>
      <div>
        {lines.map((line, idx) => (
          <div key={idx} className={[styles.line, lineClass[line.type]].join(" ")}>
            <span className={styles.lineNumber} aria-hidden="true">
              {line.lineNumber}
            </span>
            <span className={styles.lineContent}>
              {linePrefix[line.type]}
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
