/** Core domain types for the shop. All monetary amounts are integer cents. */

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  taxable: boolean;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export type Discount =
  | { kind: "percentage"; code: string; percent: number }
  | { kind: "fixed"; code: string; amountCents: number };

export type TaxRegion = "RW" | "KE" | "UG" | "EU" | "US-NY" | "NONE";

export interface Order {
  id: string;
  lines: CartLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  reservationId: string;
  placedAt: string;
}

/** Lightweight functional result type used at service boundaries. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T, E>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<T, E>(error: E): Result<T, E> {
  return { ok: false, error };
}
