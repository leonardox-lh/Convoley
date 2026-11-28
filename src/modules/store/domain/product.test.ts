import { describe, expect, test } from "vitest";
import { InvalidProductError } from "./errors";
import { validateProduct, type ProductInput } from "./product";

const product = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  name: "Polo del club",
  description: null,
  priceCents: 4500,
  variants: [
    { size: "s", stock: 3 },
    { size: "M", stock: 0 },
  ],
  stockNote: null,
  ...overrides,
});

const reason = (input: ProductInput) => {
  try {
    validateProduct(input);
    return null;
  } catch (error) {
    return (error as InvalidProductError).reason;
  }
};

describe("HU-23: reglas del producto", () => {
  test("variantes por talla: normaliza la talla y acepta stock 0", () => {
    expect(validateProduct(product()).variants).toEqual([
      { size: "S", stock: 3 },
      { size: "M", stock: 0 },
    ]);
  });

  test("sin tallas: una sola variante sin talla", () => {
    expect(validateProduct(product({ variants: [{ size: "", stock: 10 }] })).variants).toEqual([
      { size: null, stock: 10 },
    ]);
  });

  test("rechaza tallas repetidas, mezcla con talla única y stock negativo", () => {
    expect(
      reason(
        product({
          variants: [
            { size: "M", stock: 1 },
            { size: "m", stock: 2 },
          ],
        }),
      ),
    ).toBe("duplicate_size");
    expect(
      reason(
        product({
          variants: [
            { size: "M", stock: 1 },
            { size: null, stock: 2 },
          ],
        }),
      ),
    ).toBe("mixed_sizes");
    expect(reason(product({ variants: [{ size: null, stock: -1 }] }))).toBe("stock");
    expect(reason(product({ variants: [] }))).toBe("no_variants");
  });

  test("precio en céntimos mayor que 0 y nombre obligatorio", () => {
    expect(reason(product({ priceCents: 0 }))).toBe("price");
    expect(reason(product({ priceCents: 10.5 }))).toBe("price");
    expect(reason(product({ name: "  " }))).toBe("name");
  });
  test("stock sin controlar: vacío (null) o con una nota corta", () => {
    expect(
      validateProduct(
        product({ variants: [{ size: null, stock: null }], stockNote: "  A pedido " }),
      ),
    ).toMatchObject({ variants: [{ size: null, stock: null }], stockNote: "A pedido" });
    expect(reason(product({ stockNote: "x".repeat(41) }))).toBe("stock_note");
  });
});
