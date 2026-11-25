import { describe, expect, it } from "vitest";
import { AccountRequiredError, NoCreditError, PaymentNotExpectedError } from "../domain/errors";
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
const ANA = { registrationId: "reg-1", signedInUserId: "user-1" };

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
    await payWithCredit(ANA);
    expect(rows[0]!.status).toBe("paid");
    expect(used).toEqual(["reg-1"]);
  });

  it("sin crédito disponible la inscripción sigue pendiente de pago", async () => {
    const { payWithCredit, rows } = setup({ available: false });
    await expect(payWithCredit(ANA)).rejects.toBeInstanceOf(NoCreditError);
    expect(rows[0]!.status).toBe("pending_payment");
  });

  it("no paga dos veces la misma inscripción", async () => {
    const { payWithCredit, used } = setup({ registration: { status: "paid" } });
    await expect(payWithCredit(ANA)).rejects.toBeInstanceOf(PaymentNotExpectedError);
    expect(used).toHaveLength(0);
  });

  it("si el organizador quita la inscripción, el crédito vuelve", async () => {
    const { payWithCredit, remove, returned } = setup();
    await payWithCredit(ANA);
    await remove({ eventId: "evt-1", registrationId: "reg-1" });
    expect(returned).toEqual(["reg-1"]);
  });
});

describe("HU-27/HU-30: el plan y el saldo solo los usa la cuenta de Google que se inscribió", () => {
  it.each([
    ["un invitado", { registration: { userId: null } }, "user-1"],
    ["alguien sin sesión", {}, null],
    ["otra cuenta", {}, "user-2"],
  ] as const)("%s no puede pagar con el plan", async (_who, options, signedInUserId) => {
    const { payWithCredit, rows, used } = setup(options);
    await expect(payWithCredit({ registrationId: "reg-1", signedInUserId })).rejects.toBeInstanceOf(
      AccountRequiredError,
    );
    expect(rows[0]!.status).toBe("pending_payment");
    expect(used).toHaveLength(0);
  });
});
