import { describe, expect, it } from "vitest";
import { InvalidPaymentHolderError, InvalidPaymentPhoneError } from "./errors";
import { validatePaymentSettings } from "./payment-settings";

describe("HU-13 criterio 2: número y nombre del titular", () => {
  it("HU-13: acepta un celular normalizado y limpia el nombre", () => {
    expect(
      validatePaymentSettings({
        paymentApp: "plin",
        paymentPhone: "+51987654321",
        paymentHolderName: " Ana Paz ",
      }),
    ).toEqual({ paymentApp: "plin", paymentPhone: "+51987654321", paymentHolderName: "Ana Paz" });
  });

  it.each(["987654321", "+51887654321", ""])("HU-13: rechaza el número %j", (paymentPhone) => {
    expect(() =>
      validatePaymentSettings({ paymentApp: "yape", paymentPhone, paymentHolderName: "Ana" }),
    ).toThrow(InvalidPaymentPhoneError);
  });

  it("HU-13: exige el nombre del titular", () => {
    expect(() =>
      validatePaymentSettings({
        paymentApp: "yape",
        paymentPhone: "+51987654321",
        paymentHolderName: "  ",
      }),
    ).toThrow(InvalidPaymentHolderError);
  });
});
