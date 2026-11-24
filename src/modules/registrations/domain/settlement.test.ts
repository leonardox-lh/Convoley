import { describe, expect, it } from "vitest";
import { settlementDecision } from "./settlement";

const base = {
  charge: "approved" as const,
  paymentStatus: "pending" as const,
  registrationStatus: "pending_payment" as const,
  eventCancelled: false,
  freeSeat: false,
};

describe("HU-20: qué hacer con la respuesta de Mercado Pago", () => {
  it("HU-20 criterio 2: un pago ya liquidado se ignora (idempotente)", () => {
    for (const paymentStatus of ["approved", "rejected", "refunded"] as const) {
      expect(settlementDecision({ ...base, paymentStatus })).toBe("ignore");
    }
  });

  it("HU-20 criterio 1: aprobado con cupo reservado marca pagado", () => {
    expect(settlementDecision(base)).toBe("mark_paid");
  });

  it("HU-19 criterio 2: rechazado marca el pago rechazado; pendiente espera", () => {
    expect(settlementDecision({ ...base, charge: "rejected" })).toBe("mark_rejected");
    expect(settlementDecision({ ...base, charge: "pending" })).toBe("keep_pending");
  });

  it("HU-20 criterio 3: si su cupo venció y hay otro libre, lo toma", () => {
    expect(settlementDecision({ ...base, registrationStatus: "cancelled", freeSeat: true })).toBe(
      "take_free_seat",
    );
  });

  it("HU-20 criterio 3: si el cupo ya se llenó, devuelve y pasa a la lista de espera", () => {
    expect(settlementDecision({ ...base, registrationStatus: "cancelled" })).toBe(
      "refund_to_waitlist",
    );
    expect(settlementDecision({ ...base, registrationStatus: "waitlisted" })).toBe(
      "refund_to_waitlist",
    );
  });

  it("HU-20 criterio 3: pago doble o convocatoria cancelada se devuelven", () => {
    expect(settlementDecision({ ...base, registrationStatus: "paid" })).toBe("refund");
    expect(settlementDecision({ ...base, eventCancelled: true })).toBe("refund");
  });

  it("HU-20 criterio 2: una devolución que falló se reintenta", () => {
    expect(settlementDecision({ ...base, paymentStatus: "refund_pending" })).toBe("retry_refund");
  });
});
