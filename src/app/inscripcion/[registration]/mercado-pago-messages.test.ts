import { describe, expect, it } from "vitest";
import { rejectionMessage } from "./mercado-pago-messages";

describe("HU-19 criterio 2: mensajes claros si el pago falla", () => {
  it("explica el motivo conocido en español", () => {
    expect(rejectionMessage("cc_rejected_insufficient_amount")).toMatch(/saldo suficiente/);
    expect(rejectionMessage("cc_rejected_bad_filled_security_code")).toMatch(/CVV/);
    expect(rejectionMessage("cc_amount_rate_limit_exceeded")).toMatch(/Yape/);
  });

  it("con un motivo desconocido o vacío da un mensaje útil, nunca el código técnico", () => {
    expect(rejectionMessage("cc_rejected_other_reason")).toMatch(/No se pudo completar/);
    expect(rejectionMessage(null)).toMatch(/No se pudo completar/);
  });
});
