import { describe, expect, it } from "vitest";
import { basisPointsToPercentText, percentToBasisPoints } from "./service-fee-input";

describe("HU-22: el porcentaje que escribe el organizador", () => {
  it("acepta enteros y hasta 2 decimales, con punto o coma", () => {
    expect(percentToBasisPoints("5")).toBe(500);
    expect(percentToBasisPoints("3.5")).toBe(350);
    expect(percentToBasisPoints("3,75")).toBe(375);
  });

  it("rechaza texto, negativos o demasiados decimales", () => {
    for (const raw of ["", "abc", "-3", "3.555", "100"]) {
      expect(percentToBasisPoints(raw)).toBeNull();
    }
  });

  it("vuelve a mostrarse igual en el formulario", () => {
    expect(basisPointsToPercentText(350)).toBe("3.5");
    expect(basisPointsToPercentText(500)).toBe("5");
  });
});
