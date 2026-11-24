import { describe, expect, it } from "vitest";
import {
  EventNotOpenError,
  MercadoPagoUnavailableError,
  PaymentNotExpectedError,
} from "../domain/errors";
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
import {
  makeSettleMercadoPagoNotification,
  makeSettleMercadoPagoPayment,
  makeStartMercadoPagoPayment,
} from "./mercado-pago-payments";
import type { ChargeReport, StoredMercadoPagoPayment } from "./ports";

const NOW = new Date("2026-11-24T12:00:00Z");

function registration(overrides: Partial<StoredRegistration> = {}): StoredRegistration {
  return {
    id: "reg-1",
    eventId: "evt-1",
    status: "pending_payment",
    firstName: "Ana",
    lastName: "Perez",
    phone: "+51987654321",
    userId: null,
    ...overrides,
  };
}

function storedPayment(
  overrides: Partial<StoredMercadoPagoPayment> = {},
): StoredMercadoPagoPayment {
  return {
    id: "pay-1",
    clubId: "club-1",
    registrationId: "reg-1",
    amountCents: 1500,
    status: "pending",
    providerPaymentId: "mp-1",
    ...overrides,
  };
}

function setup(options: {
  event?: EventSeatInfo;
  registrations?: StoredRegistration[];
  payments?: StoredMercadoPagoPayment[];
  enabled?: boolean;
  answer?: Partial<ChargeReport>;
}) {
  const { seats, markFull } = fakeEventSeats(options.event ?? seatInfo());
  const { repository, rows } = fakeRegistrationRepository(
    options.registrations ?? [registration()],
  );
  const { gateway, calls } = fakeMercadoPagoGateway({
    enabled: options.enabled,
    answer: options.answer,
    accountClubs: { "seller-1": "club-1" },
  });
  const { records, rows: payments } = fakeMercadoPagoRecords(options.payments ?? []);
  const deps = {
    events: seats,
    registrations: repository,
    gateway,
    records,
    transactions: fakeTransactions,
    now: () => NOW,
  };
  const settle = makeSettleMercadoPagoPayment(deps);
  return {
    start: makeStartMercadoPagoPayment(deps, settle),
    notify: makeSettleMercadoPagoNotification(deps, settle),
    rows,
    payments,
    calls,
    markFull,
  };
}

const payInput = {
  registrationId: "reg-1",
  token: "card-token",
  paymentMethodId: "visa",
  installments: 1,
  issuerId: null,
  payerEmail: "ana@example.com",
};

describe("HU-19: pagar con Yape o tarjeta dentro de Convoley", () => {
  it("HU-19 criterio 1: cobra el precio de la convocatoria y la inscripción queda pagada", async () => {
    const { start, rows, payments, calls } = setup({ event: seatInfo({ priceCents: 1500 }) });

    const outcome = await start(payInput);

    expect(outcome).toMatchObject({ result: "approved", settlement: "mark_paid" });
    expect(calls.charged).toEqual([
      expect.objectContaining({
        amountCents: 1500,
        token: "card-token",
        externalReference: "pay-1",
      }),
    ]);
    // A retried request reuses the attempt's id, so Mercado Pago never charges twice.
    expect(calls.charged[0]!.idempotencyKey).toBe("pay-1");
    expect(payments[0]).toMatchObject({ status: "approved", providerPaymentId: "mp-1" });
    expect(rows[0]!.status).toBe("paid");
  });

  it("HU-19 criterio 1: Yape usa el mismo flujo con su propio medio de pago", async () => {
    const { start, calls } = setup({});
    await start({ ...payInput, token: "yape-token", paymentMethodId: "yape" });
    expect(calls.charged[0]).toMatchObject({ paymentMethodId: "yape", token: "yape-token" });
  });

  it("HU-19 criterio 2: si Mercado Pago rechaza, la inscripción sigue pendiente para reintentar", async () => {
    const { start, rows, payments } = setup({
      answer: { result: "rejected", statusDetail: "cc_rejected_insufficient_amount" },
    });

    const outcome = await start(payInput);

    expect(outcome).toMatchObject({
      result: "rejected",
      statusDetail: "cc_rejected_insufficient_amount",
    });
    expect(payments[0]!.status).toBe("rejected");
    expect(rows[0]!.status).toBe("pending_payment");
  });

  it("HU-19: sin Mercado Pago conectado no se cobra (el jugador paga por captura)", async () => {
    const { start, calls } = setup({ enabled: false });
    await expect(start(payInput)).rejects.toThrow(MercadoPagoUnavailableError);
    expect(calls.charged).toEqual([]);
  });

  it("HU-19: no cobra una inscripción ya pagada ni una convocatoria cancelada", async () => {
    const paid = setup({ registrations: [registration({ status: "paid" })] });
    await expect(paid.start(payInput)).rejects.toThrow(PaymentNotExpectedError);

    const cancelled = setup({ event: seatInfo({ status: "cancelled" }) });
    await expect(cancelled.start(payInput)).rejects.toThrow(EventNotOpenError);
  });
});

describe("HU-20: el webhook marca pagado", () => {
  it("HU-20 criterio 1: consulta el pago en Mercado Pago y marca la inscripción pagada", async () => {
    const { notify, rows, payments } = setup({ payments: [storedPayment()] });

    expect(await notify({ providerPaymentId: "mp-1", mpUserId: "seller-1" })).toBe("mark_paid");
    expect(rows[0]!.status).toBe("paid");
    expect(payments[0]!.status).toBe("approved");
  });

  it("HU-20 criterio 1: si el webhook llega antes de guardar el id, lo encuentra por external_reference", async () => {
    const { notify, payments } = setup({
      payments: [storedPayment({ providerPaymentId: null })],
      answer: { externalReference: "pay-1" },
    });

    expect(await notify({ providerPaymentId: "mp-9", mpUserId: "seller-1" })).toBe("mark_paid");
    expect(payments[0]!.providerPaymentId).toBe("mp-9");
  });

  it("HU-20 criterio 2: dos notificaciones iguales no duplican nada", async () => {
    const { notify, payments, calls } = setup({ payments: [storedPayment()] });

    await notify({ providerPaymentId: "mp-1", mpUserId: "seller-1" });
    expect(await notify({ providerPaymentId: "mp-1", mpUserId: "seller-1" })).toBe("ignore");
    expect(payments).toHaveLength(1);
    expect(calls.refunded).toEqual([]);
  });

  it("HU-20: no marca nada si el monto o la moneda no coinciden con lo cobrado", async () => {
    const wrongAmount = setup({ payments: [storedPayment()], answer: { amountCents: 100 } });
    expect(await wrongAmount.notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe(
      "mismatch",
    );
    expect(wrongAmount.rows[0]!.status).toBe("pending_payment");

    const wrongCurrency = setup({ payments: [storedPayment()], answer: { currency: "USD" } });
    expect(await wrongCurrency.notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe(
      "mismatch",
    );
  });

  it("HU-20: ignora pagos que no son de Convoley", async () => {
    const { notify } = setup({});
    expect(await notify({ providerPaymentId: "mp-x", mpUserId: "unknown-seller" })).toBe(
      "unknown_payment",
    );
  });

  it("HU-20 criterio 3: si el cupo ya se llenó, devuelve el dinero y lo pasa a la lista de espera", async () => {
    const { notify, rows, payments, calls } = setup({
      event: seatInfo({ capacity: 1, status: "full" }),
      registrations: [
        registration({ status: "cancelled" }),
        registration({ id: "reg-2", phone: "+51911111111", status: "paid" }),
      ],
      payments: [storedPayment()],
    });

    expect(await notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe("refund_to_waitlist");
    expect(rows[0]!.status).toBe("waitlisted");
    expect(calls.refunded).toEqual([{ providerPaymentId: "mp-1", idempotencyKey: "refund-pay-1" }]);
    expect(payments[0]!.status).toBe("refunded");
  });

  it("HU-20 criterio 3: si su cupo se liberó pero queda otro libre, lo toma y marca lleno si era el último", async () => {
    const { notify, rows, markFull } = setup({
      event: seatInfo({ capacity: 1 }),
      registrations: [registration({ status: "cancelled" })],
      payments: [storedPayment()],
    });

    expect(await notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe("take_free_seat");
    expect(rows[0]!.status).toBe("paid");
    expect(markFull).toEqual(["evt-1"]);
  });
});
