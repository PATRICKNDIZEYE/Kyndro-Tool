import type { Discount } from "./types.js";
import { roundCents } from "./money.js";

/**
 * Apply a set of discounts to a subtotal and return the discounted total in cents.
 *
 * Since PR #42 multiple promotions may be stacked: percentage discounts are
 * summed and applied once, then fixed-amount discounts are subtracted.
 */
export function applyDiscount(subtotalCents: number, discounts: Discount[]): number {
  let percentTotal = 0;
  let fixedTotal = 0;
  for (const d of discounts) {
    if (d.kind === "percentage") {
      percentTotal += d.percent;
    } else {
      fixedTotal += d.amountCents;
    }
  }
  const afterPercentage = subtotalCents * (1 - percentTotal / 100);
  return roundCents(afterPercentage - fixedTotal);
}

/** A discount code is 4-12 uppercase alphanumerics. */
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(code);
}
