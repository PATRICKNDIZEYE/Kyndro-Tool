import type { CartLine, Product } from "./types.js";

/** In-memory shopping cart. One line per product id; quantities merge. */
export class Cart {
  private lines = new Map<string, CartLine>();

  addItem(product: Product, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new RangeError(`quantity must be a positive integer, got ${quantity}`);
    }
    const existing = this.lines.get(product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.lines.set(product.id, { product, quantity });
    }
  }

  removeItem(productId: string): void {
    this.lines.delete(productId);
  }

  lineCount(): number {
    return this.lines.size;
  }

  subtotalCents(): number {
    let total = 0;
    for (const line of this.lines.values()) {
      total += line.product.priceCents * line.quantity;
    }
    return total;
  }

  toLines(): CartLine[] {
    return [...this.lines.values()].map((l) => ({ ...l }));
  }
}
