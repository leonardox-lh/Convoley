import { describe, expect, test } from "vitest";
import { parseStockInput, stockInputText } from "./stock-input";

describe("HU-23: campo de stock por talla", () => {
  test("un número es talla única", () => {
    expect(parseStockInput(" 12 ")).toEqual([{ size: null, stock: 12 }]);
  });

  test("talla:stock separados por coma", () => {
    expect(parseStockInput("S:3, M=5, XL:0")).toEqual([
      { size: "S", stock: 3 },
      { size: "M", stock: 5 },
      { size: "XL", stock: 0 },
    ]);
  });

  test("texto ilegible o vacío", () => {
    expect(parseStockInput("")).toBeNull();
    expect(parseStockInput("S tres")).toBeNull();
  });

  test("ida y vuelta para el formulario de edición", () => {
    expect(
      stockInputText([
        { size: "S", stock: 3 },
        { size: "M", stock: 0 },
      ]),
    ).toBe("S:3, M:0");
    expect(stockInputText([{ size: null, stock: 7 }])).toBe("7");
  });
});
