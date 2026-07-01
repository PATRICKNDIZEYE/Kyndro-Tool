import type { CartLine, Result } from "./types.js";
import { err, ok } from "./types.js";

export interface Reservation {
  id: string;
  expiresAt: string;
}

export interface StockError {
  productId: string;
  requested: number;
  available: number;
}

const HOLD_MINUTES = 15;

/** Fake warehouse ledger; a real implementation would call the inventory service. */
const available = new Map<string, number>();

export const seedStock = (productId: string, units: number): void => {
  available.set(productId, units);
};

/**
 * Reserve stock for every line in the cart, atomically.
 * Returns err on the first shortage; never throws.
 */
export const reserveStock = async (
  lines: CartLine[],
): Promise<Result<Reservation, StockError>> => {
  for (const line of lines) {
    const units = available.get(line.product.id) ?? 0;
    if (units < line.quantity) {
      return err({
        productId: line.product.id,
        requested: line.quantity,
        available: units,
      });
    }
  }
  for (const line of lines) {
    const units = available.get(line.product.id) ?? 0;
    available.set(line.product.id, units - line.quantity);
  }
  const expires = new Date(Date.now() + HOLD_MINUTES * 60_000);
  return ok({
    id: `rsv_${Math.random().toString(36).slice(2, 10)}`,
    expiresAt: expires.toISOString(),
  });
};
