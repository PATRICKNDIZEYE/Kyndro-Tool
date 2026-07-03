import styles from "./CodeBlock.module.css";

export interface CodeBlockProps {
  code: string;
  language?: string;
  caption?: string;
}

export function CodeBlock({ code, language = "text", caption }: CodeBlockProps) {
  return (
    <figure>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
      <pre className={styles.pre}>
        <code data-language={language}>{code}</code>
      </pre>
    </figure>
  );
}
