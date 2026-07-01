/** Money helpers. Amounts are integer cents everywhere; floats only appear transiently. */

/** Round a possibly-fractional cent amount to whole cents, half away from zero. */
export function roundCents(amount: number): number {
  return Math.sign(amount) * Math.round(Math.abs(amount));
}

/** Render cents as a display string, e.g. 123456 -> "1,234.56". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const units = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rem = (abs % 100).toString().padStart(2, "0");
  return `${sign}${units}.${rem}`;
}
