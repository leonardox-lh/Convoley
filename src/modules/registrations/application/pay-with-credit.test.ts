import { describe, expect, it } from "vitest";
import { NoCreditError, PaymentNotExpectedError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import {
  fakeCredits,
  fakeEventSeats,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makePayWithCredit } from "./pay-with-credit";
import { makeRemoveRegistration } from "./remove-registration";

const NOW = new Date("2026-12-01T12:00:00Z");

function setup(
  options: {
    registration?: Partial<StoredRegistration>;
    event?: EventSeatInfo;
    available?: boolean;
  } = {},
) {
  const { seats } = fakeEventSeats(options.event ?? seatInfo());
  const { repository, rows } = fakeRegistrationRepository([
    {
      id: "reg-1",
      eventId: "evt-1",
      status: "pending_payment",
      firstName: "Ana",
      lastName: "Pérez",
      phone: "+51987654321",
      userId: "user-1",
      ...options.registration,
    },
  ]);
  const { credits, used, returned } = fakeCredits({ available: options.available });
  const deps = {
    events: seats,
    registrations: repository,
    credits,
    transactions: fakeTransactions,
  };
  return {
    payWithCredit: makePayWithCredit({ ...deps, now: () => NOW }),
    remove: makeRemoveRegistration(deps),
    rows,
    used,
    returned,
  };
}

describe("HU-27: la inscripción con crédito queda pagada", () => {
  it("gasta un crédito y marca la inscripción como pagada", async () => {
    const { payWithCredit, rows, used } = setup();
    await payWithCredit("reg-1");
    expect(rows[0]!.status).toBe("paid");
    expect(used).toEqual(["reg-1"]);
  });

  it("sin crédito disponible la inscripción sigue pendiente de pago", async () => {
    const { payWithCredit, rows } = setup({ available: false });
    await expect(payWithCredit("reg-1")).rejects.toBeInstanceOf(NoCreditError);
    expect(rows[0]!.status).toBe("pending_payment");
  });

  it("no paga dos veces la misma inscripción", async () => {
    const { payWithCredit, used } = setup({ registration: { status: "paid" } });
    await expect(payWithCredit("reg-1")).rejects.toBeInstanceOf(PaymentNotExpectedError);
    expect(used).toHaveLength(0);
  });

  it("si el organizador quita la inscripción, el crédito vuelve", async () => {
    const { payWithCredit, remove, returned } = setup();
    await payWithCredit("reg-1");
    await remove({ eventId: "evt-1", registrationId: "reg-1" });
    expect(returned).toEqual(["reg-1"]);
  });
});
