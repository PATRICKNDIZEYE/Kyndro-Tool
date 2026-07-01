import type { Cart } from "./cart.js";
import { applyDiscount } from "./discount.js";
import { reserveStock, type StockError } from "./inventory.js";
import { calculateTax } from "./tax.js";
import type { Discount, Order, Result, TaxRegion } from "./types.js";
import { err, ok } from "./types.js";

export type CheckoutError =
  | { kind: "empty_cart" }
  | { kind: "out_of_stock"; detail: StockError };

/**
 * Price the cart, reserve stock, and produce an order.
 * total = subtotal - discount + tax, all in integer cents.
 */
export async function checkout(
  cart: Cart,
  discounts: Discount[],
  region: TaxRegion,
): Promise<Result<Order, CheckoutError>> {
  const lines = cart.toLines();
  if (lines.length === 0) {
    return err({ kind: "empty_cart" });
  }

  const subtotalCents = cart.subtotalCents();
  const discountedCents = applyDiscount(subtotalCents, discounts);
  const discountCents = subtotalCents - discountedCents;
  const taxCents = calculateTax(discountedCents, region);

  const reservation = await reserveStock(lines);
  if (!reservation.ok) {
    return err({ kind: "out_of_stock", detail: reservation.error });
  }

  return ok({
    id: `ord_${Date.now().toString(36)}`,
    lines,
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: discountedCents + taxCents,
    reservationId: reservation.value.id,
    placedAt: new Date().toISOString(),
  });
}
