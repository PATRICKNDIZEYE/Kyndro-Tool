import type { TaxRegion } from "./types.js";
import { roundCents } from "./money.js";

const RATES: Record<TaxRegion, number> = {
  RW: 0.18,
  KE: 0.16,
  UG: 0.18,
  EU: 0.21,
  "US-NY": 0.08875,
  NONE: 0,
};

/** VAT/sales tax owed on a taxable amount, in cents. */
export function calculateTax(taxableCents: number, region: TaxRegion): number {
  if (taxableCents <= 0) {
    return 0;
  }
  return roundCents(taxableCents * RATES[region]);
}
