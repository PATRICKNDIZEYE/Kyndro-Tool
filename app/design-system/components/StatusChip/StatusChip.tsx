import styles from "./StatusChip.module.css";
import type { Verdict } from "../../tokens/colors";

export type { Verdict };

export interface StatusChipProps {
  verdict: Verdict;
  /**
   * Bounded-verification disclosure for VERIFIED (e.g. "1000 inputs, seed a1b2").
   * Sprint 11 makes this a first-class disclosure; v1 just reserves the slot.
   */
  boundsLabel?: string;
}

const verdictClass: Record<Verdict, string> = {
  VERIFIED: styles.verified,
  FALSIFIED: styles.falsified,
  UNKNOWN: styles.unknown,
};

export function StatusChip({ verdict, boundsLabel }: StatusChipProps) {
  return (
    <span className={[styles.chip, verdictClass[verdict]].join(" ")} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {verdict}
      {verdict === "VERIFIED" && boundsLabel ? (
        <span className={styles.boundsHint}>· {boundsLabel}</span>
      ) : null}
    </span>
  );
}
