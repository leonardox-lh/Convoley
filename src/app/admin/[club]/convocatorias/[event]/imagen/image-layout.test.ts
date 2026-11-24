import { describe, expect, it } from "vitest";
import { listImageLayout } from "./image-layout";

describe("HU-16 criterio 1: formatos cuadrado (1:1) e historia (9:16)", () => {
  it("HU-16: cuadrado mide 1080×1080", () => {
    expect(listImageLayout("cuadrado", 12)).toMatchObject({ width: 1080, height: 1080 });
  });

  it("HU-16: historia mide 1080×1920", () => {
    expect(listImageLayout("historia", 12)).toMatchObject({ width: 1080, height: 1920 });
  });
});

describe("HU-16: la lista entra completa en la imagen", () => {
  it.each([
    ["cuadrado", 6],
    ["cuadrado", 30],
    ["historia", 30],
    ["historia", 60],
  ] as const)("HU-16: %s con %i filas no se sale de la imagen", (format, rows) => {
    const layout = listImageLayout(format, rows);
    const rowsPerColumn = Math.ceil(rows / layout.columns);
    expect(rowsPerColumn * layout.rowPx).toBeLessThanOrEqual(layout.height - 260 - 80);
  });

  it("HU-16: una lista corta usa una columna y letra grande", () => {
    expect(listImageLayout("cuadrado", 6)).toMatchObject({ columns: 1, rowPx: 64 });
  });

  it("HU-16: una lista larga en cuadrado pasa a dos columnas", () => {
    expect(listImageLayout("cuadrado", 30).columns).toBe(2);
  });
});
