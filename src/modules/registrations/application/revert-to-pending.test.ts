import { describe, expect, it } from "vitest";
import {
  EventNotOpenError,
  RegistrationNotFoundError,
  RegistrationNotPaidError,
} from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import {
  fakeCredits,
  fakeEventSeats,
  fakePaymentReversals,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeRevertToPending } from "./revert-to-pending";

const paidRegistration = {
  id: "reg-1",
  eventId: "evt-1",
  status: "paid",
  firstName: "Ana",
  lastName: "",
  phone: null,
  userId: null,
} as StoredRegistration;

function setup(options: {
  event?: EventSeatInfo | null;
  registration?: StoredRegistration;
  chargedByMercadoPago?: boolean;
}) {
  const { seats } = fakeEventSeats(options.event === undefined ? seatInfo() : options.event);
  const { repository, rows } = fakeRegistrationRepository([
    options.registration ?? { ...paidRegistration },
  ]);
  const { payments, reverted } = fakePaymentReversals(options);
  const { credits, returned } = fakeCredits();
  const revertToPending = makeRevertToPending({
    events: seats,
    registrations: repository,
    payments,
    credits,
    transactions: fakeTransactions,
  });
  return { revertToPending, rows, reverted, returned };
}

const input = { eventId: "evt-1", registrationId: "reg-1", reviewedByUserId: "org-1" };

describe("volver de pagado a pendiente", () => {
  it("deja la inscripción pendiente, revierte sus pagos y devuelve el crédito del plan", async () => {
    const { revertToPending, rows, reverted, returned } = setup({});
    expect(await revertToPending(input)).toEqual({ chargedByMercadoPago: false });
    expect(rows[0]!.status).toBe("pending_payment");
    expect(reverted).toEqual(["reg-1"]);
    expect(returned).toEqual(["reg-1"]);
  });

  it("avisa si el pago fue por Mercado Pago: la devolución se hace allá", async () => {
    const { revertToPending } = setup({ chargedByMercadoPago: true });
    expect(await revertToPending(input)).toEqual({ chargedByMercadoPago: true });
  });

  it("solo revierte inscripciones pagadas", async () => {
    const { revertToPending, reverted } = setup({
      registration: { ...paidRegistration, status: "pending_payment" },
    });
    await expect(revertToPending(input)).rejects.toThrow(RegistrationNotPaidError);
    expect(reverted).toEqual([]);
  });

  it("no toca convocatorias canceladas ni inscripciones de otra convocatoria", async () => {
    await expect(
      setup({ event: seatInfo({ status: "cancelled" }) }).revertToPending(input),
    ).rejects.toThrow(EventNotOpenError);
    await expect(
      setup({ registration: { ...paidRegistration, eventId: "evt-2" } }).revertToPending(input),
    ).rejects.toThrow(RegistrationNotFoundError);
  });
});
