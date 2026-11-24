import { describe, expect, it } from "vitest";
import { InvalidServiceFeeError } from "./errors";
import { parseServiceFee, serviceFeeCents } from "./service-fee";

describe("HU-22: cargo por servicio", () => {
  it("HU-22 criterio 1: monto fijo o porcentaje, nunca los dos", () => {
    expect(parseServiceFee("fixed", 150)).toEqual({ fixedCents: 150, percentBps: 0 });
    expect(parseServiceFee("percent", 350)).toEqual({ fixedCents: 0, percentBps: 350 });
    expect(parseServiceFee("none", 999)).toEqual({ fixedCents: 0, percentBps: 0 });
  });

  it("HU-22 criterio 1: rechaza montos fuera del límite (S/ 50 o 20 %)", () => {
    expect(() => parseServiceFee("fixed", 5_001)).toThrow(InvalidServiceFeeError);
    expect(() => parseServiceFee("percent", 2_001)).toThrow(InvalidServiceFeeError);
    expect(() => parseServiceFee("fixed", 0)).toThrow(InvalidServiceFeeError);
    expect(() => parseServiceFee("percent", 2.5)).toThrow(InvalidServiceFeeError);
  });

  it("HU-22: el porcentaje se redondea hacia arriba al céntimo", () => {
    // 3.5 % of S/ 15.00 = 52.5 cents → 53
    expect(serviceFeeCents(1500, { fixedCents: 0, percentBps: 350 })).toBe(53);
    expect(serviceFeeCents(1500, { fixedCents: 100, percentBps: 0 })).toBe(100);
    expect(serviceFeeCents(1500, { fixedCents: 0, percentBps: 0 })).toBe(0);
  });
});
