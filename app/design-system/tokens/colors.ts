export const colors = {
  bg: "var(--kyndro-color-bg)",
  bgSubtle: "var(--kyndro-color-bg-subtle)",
  border: "var(--kyndro-color-border)",
  text: "var(--kyndro-color-text)",
  textMuted: "var(--kyndro-color-text-muted)",
  brand: "var(--kyndro-color-brand)",
  brandHover: "var(--kyndro-color-brand-hover)",
  brandContrast: "var(--kyndro-color-brand-contrast)",
  danger: "var(--kyndro-color-danger)",
  dangerBg: "var(--kyndro-color-danger-bg)",
} as const;

/** Mirrors the contract's Verdict enum exactly (contract/openapi.yaml#/components/schemas/Verdict). */
export const verdictColors = {
  VERIFIED: {
    bg: "var(--kyndro-color-verified-bg)",
    fg: "var(--kyndro-color-verified-fg)",
    border: "var(--kyndro-color-verified-border)",
  },
  FALSIFIED: {
    bg: "var(--kyndro-color-falsified-bg)",
    fg: "var(--kyndro-color-falsified-fg)",
    border: "var(--kyndro-color-falsified-border)",
  },
  UNKNOWN: {
    bg: "var(--kyndro-color-unknown-bg)",
    fg: "var(--kyndro-color-unknown-fg)",
    border: "var(--kyndro-color-unknown-border)",
  },
} as const;

export type Verdict = keyof typeof verdictColors;
