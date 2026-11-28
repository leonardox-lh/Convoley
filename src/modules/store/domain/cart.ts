import { InvalidCartError } from "./errors";

export const MAX_QUANTITY_PER_ITEM = 10;

export interface CartLine {
  variantId: string;
  quantity: number;
}

/** HU-24: a simple cart, 1 to 10 units of each size; the same size twice adds up. */
export function validateCart(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new InvalidCartError("quantity");
    }
    merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + line.quantity);
  }
  if (merged.size === 0) throw new InvalidCartError("empty");
  if ([...merged.values()].some((quantity) => quantity > MAX_QUANTITY_PER_ITEM)) {
    throw new InvalidCartError("quantity");
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function orderTotalCents(items: { quantity: number; unitPriceCents: number }[]): number {
  return items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0);
}

/** Whether every line can be served with the current stock (by variant id; null = not tracked). */
export function inStock(lines: CartLine[], stock: Map<string, number | null>): boolean {
  return lines.every((line) => {
    if (!stock.has(line.variantId)) return false;
    const available = stock.get(line.variantId);
    return available === null || available! >= line.quantity;
  });
}
