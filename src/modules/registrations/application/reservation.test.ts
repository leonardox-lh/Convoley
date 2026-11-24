import { describe, expect, it } from "vitest";
import { PaymentNotExpectedError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import {
  fakeEventSeats,
  fakeMercadoPagoGateway,
  fakeMercadoPagoRecords,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeSettleMercadoPagoPayment, makeStartMercadoPagoPayment } from "./mercado-pago-payments";
import { makeRegisterGuest } from "./register-guest";

const SIGN_UP_TIME = new Date("2026-11-24T12:00:00Z");
const TEN_MINUTES_LATER = new Date("2026-11-24T12:10:00Z");

const guest = (phone: string) => ({
  eventId: "evt-1",
  firstName: "Ana",
  lastName: phone,
  phone,
  userId: null,
});

function setup(options: {
  event?: EventSeatInfo;
  existing?: StoredRegistration[];
  mercadoPago?: boolean;
}) {
  let now = SIGN_UP_TIME;
  const { seats, markFull, reopened } = fakeEventSeats(options.event ?? seatInfo());
  const { repository, rows } = fakeRegistrationRepository(options.existing ?? []);
  const { gateway } = fakeMercadoPagoGateway({ enabled: options.mercadoPago ?? true });
  const deps = {
    events: seats,
    registrations: repository,
    transactions: fakeTransactions,
    now: () => now,
  };
  const paymentDeps = {
    ...deps,
    gateway,
    records: fakeMercadoPagoRecords().records,
    serviceFees: { forCharge: async () => 0 },
  };
  return {
    registerGuest: makeRegisterGuest({ ...deps, mercadoPago: gateway }),
    startPayment: makeStartMercadoPagoPayment(
      paymentDeps,
      makeSettleMercadoPagoPayment(paymentDeps),
    ),
    setNow: (date: Date) => (now = date),
    rows,
    markFull,
    reopened,
  };
}

describe("HU-21: el cupo queda reservado mientras pago", () => {
  it("HU-21 criterio 1: con Mercado Pago el cupo se reserva 10 minutos", async () => {
    const { registerGuest, rows } = setup({});

    const { reservedUntil } = await registerGuest(guest("911111111"));

    expect(reservedUntil).toEqual(TEN_MINUTES_LATER);
    expect(rows[0]!.reservedUntil).toEqual(TEN_MINUTES_LATER);
  });

  it("HU-21 criterio 1: sin Mercado Pago (pago por captura) o en la lista de espera no hay plazo", async () => {
    const voucherClub = setup({ mercadoPago: false });
    expect((await voucherClub.registerGuest(guest("911111111"))).reservedUntil).toBeNull();

    const full = setup({ event: seatInfo({ capacity: 1 }) });
    await full.registerGuest(guest("911111111"));
    const waiting = await full.registerGuest(guest("922222222"));
    expect(waiting).toMatchObject({ status: "waitlisted", reservedUntil: null });
  });

  it("HU-21 criterio 2: si vence sin pago, el cupo se libera para el siguiente", async () => {
    const { registerGuest, setNow, rows } = setup({ event: seatInfo({ capacity: 1 }) });
    await registerGuest(guest("911111111"));

    setNow(TEN_MINUTES_LATER);
    const next = await registerGuest(guest("922222222"));

    expect(rows[0]!.status).toBe("cancelled");
    expect(next.status).toBe("pending_payment");
  });

  it("HU-21 criterio 2: el cupo liberado pasa al primero de la lista de espera", async () => {
    const { registerGuest, setNow, rows } = setup({ event: seatInfo({ capacity: 1 }) });
    await registerGuest(guest("911111111"));
    await registerGuest(guest("922222222"));

    setNow(TEN_MINUTES_LATER);
    const late = await registerGuest(guest("933333333"));

    expect(rows.map((row) => row.status)).toEqual(["cancelled", "pending_payment", "waitlisted"]);
    expect(late.status).toBe("waitlisted");
  });

  it("HU-21 criterio 2: con la reserva vencida ya no se puede cobrar", async () => {
    const { registerGuest, startPayment, setNow } = setup({});
    const { id } = await registerGuest(guest("911111111"));

    setNow(TEN_MINUTES_LATER);

    await expect(
      startPayment({
        registrationId: id,
        token: "card-token",
        paymentMethodId: "visa",
        installments: 1,
        issuerId: null,
        payerEmail: "ana@example.com",
      }),
    ).rejects.toThrow(PaymentNotExpectedError);
  });

  it("HU-21: pagar a tiempo termina la reserva", async () => {
    const { registerGuest, startPayment, rows } = setup({});
    const { id } = await registerGuest(guest("911111111"));

    await startPayment({
      registrationId: id,
      token: "card-token",
      paymentMethodId: "visa",
      installments: 1,
      issuerId: null,
      payerEmail: "ana@example.com",
    });

    expect(rows[0]).toMatchObject({ status: "paid", reservedUntil: null });
  });
});
