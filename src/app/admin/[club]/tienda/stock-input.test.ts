import { describe, expect, test } from "vitest";
import { parseStockInput, stockInputText } from "./stock-input";

describe("HU-23: campo de stock por talla", () => {
  test("un número es talla única", () => {
    expect(parseStockInput(" 12 ")).toEqual({
      variants: [{ size: null, stock: 12 }],
      stockNote: null,
    });
  });

  test("talla:stock separados por coma", () => {
    expect(parseStockInput("S:3, M=5, XL:0")?.variants).toEqual([
      { size: "S", stock: 3 },
      { size: "M", stock: 5 },
      { size: "XL", stock: 0 },
    ]);
  });

  test("vacío: no se controla el stock", () => {
    expect(parseStockInput("  ")).toEqual({
      variants: [{ size: null, stock: null }],
      stockNote: null,
    });
  });

  test("texto libre: no se controla el stock y se guarda como nota", () => {
    expect(parseStockInput(" A pedido ")).toEqual({
      variants: [{ size: null, stock: null }],
      stockNote: "A pedido",
    });
  });

  test("una lista por talla con un error no se toma como texto", () => {
    expect(parseStockInput("S:3, M5")).toBeNull();
    expect(parseStockInput("S: tres")).toBeNull();
    expect(parseStockInput("12345")).toBeNull();
    expect(parseStockInput("-3")).toBeNull();
  });

  test("ida y vuelta para el formulario de edición", () => {
    const sized = [
      { size: "S", stock: 3 },
      { size: "M", stock: 0 },
    ];
    expect(stockInputText({ variants: sized, stockNote: null })).toBe("S:3, M:0");
    expect(stockInputText({ variants: [{ size: null, stock: 7 }], stockNote: null })).toBe("7");
    expect(stockInputText({ variants: [{ size: null, stock: null }], stockNote: "A pedido" })).toBe(
      "A pedido",
    );
    expect(stockInputText({ variants: [{ size: null, stock: null }], stockNote: null })).toBe("");
  });
});
