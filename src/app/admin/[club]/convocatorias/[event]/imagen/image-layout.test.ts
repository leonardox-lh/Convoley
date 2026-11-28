import { describe, expect, it } from "vitest";
import { listImageLayout } from "./image-layout";

describe("HU-16 criterio 1: formatos cuadrado (1:1) e historia (9:16)", () => {
  // A full list fills the format; rows are whole pixels, so up to one row may be left over.
  it.each([
    ["cuadrado", 1080],
    ["historia", 1920],
  ] as const)("HU-16: %s llena mide 1080 de ancho y casi %i de alto", (format, height) => {
    const layout = listImageLayout(format, 80);
    expect(layout.width).toBe(1080);
    expect(layout.height).toBeLessThanOrEqual(height);
    expect(layout.height).toBeGreaterThan(height - layout.rowPx);
  });
});

describe("El alto de la imagen se acomoda a la lista", () => {
  it.each(["cuadrado", "historia"] as const)(
    "%s: una lista corta termina después de su última fila, sin espacio vacío",
    (format) => {
      const layout = listImageLayout(format, 6);
      expect(layout.height).toBeLessThan(listImageLayout(format, 40).height);
      expect(layout.height).toBeGreaterThanOrEqual(6 * layout.rowPx);
    },
  );

  it.each(["cuadrado", "historia"] as const)("%s: nunca pasa el alto del formato", (format) => {
    expect(listImageLayout(format, 80).height).toBeLessThanOrEqual(
      format === "cuadrado" ? 1080 : 1920,
    );
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
