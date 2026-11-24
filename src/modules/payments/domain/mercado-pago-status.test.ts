import { describe, expect, it } from "vitest";
import { centsToSolesAmount, chargeOutcome, solesToCentsExact } from "./mercado-pago-status";

describe("HU-19/HU-20: estados de Mercado Pago", () => {
  it.each([
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["cancelled", "rejected"],
    ["in_process", "pending"],
    ["pending", "pending"],
    ["authorized", "pending"],
  ])("HU-20 criterio 1: %s se trata como %s", (mpStatus, expected) => {
    expect(chargeOutcome(mpStatus)).toBe(expected);
  });

  it("HU-19: convierte soles con decimales a céntimos enteros sin errores de redondeo", () => {
    expect(solesToCentsExact(15.1)).toBe(1510);
    expect(solesToCentsExact(0.29)).toBe(29);
    expect(centsToSolesAmount(1510)).toBe(15.1);
  });
});
