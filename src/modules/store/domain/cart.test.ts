import { describe, expect, test } from "vitest";
import { inStock } from "./cart";

describe("HU-23: stock disponible para un pedido", () => {
  const line = (variantId: string, quantity: number) => ({ variantId, quantity });

  test("con stock contado, alcanza solo si hay suficientes unidades", () => {
    const stock = new Map([["var-s", 2]]);
    expect(inStock([line("var-s", 2)], stock)).toBe(true);
    expect(inStock([line("var-s", 3)], stock)).toBe(false);
  });

  test("stock sin controlar (null) siempre alcanza", () => {
    expect(inStock([line("var-x", 50)], new Map([["var-x", null]]))).toBe(true);
  });

  test("una variante que ya no se vende no alcanza", () => {
    expect(inStock([line("var-gone", 1)], new Map())).toBe(false);
  });
});
