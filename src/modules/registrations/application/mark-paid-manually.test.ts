import { describe, expect, it } from "vitest";
import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import {
  fakeEventSeats,
  fakeManualPayments,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeMarkPaidManually } from "./mark-paid-manually";

const ORGANIZER_ID = "user-1";

function stored(overrides: Partial<StoredRegistration> = {}): StoredRegistration {
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

function setup(event: EventSeatInfo | null, existing: StoredRegistration[]) {
  const { seats } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository(existing);
  const { payments, recorded } = fakeManualPayments();
  const markPaidManually = makeMarkPaidManually({
    events: seats,
    registrations: repository,
    payments,
    transactions: fakeTransactions,
  });
  return { markPaidManually, rows, recorded };
}

const input = { eventId: "evt-1", registrationId: "reg-1", reviewedByUserId: ORGANIZER_ID };

describe("HU-08 criterio 1: marcar como pagado manual", () => {
  it("HU-08 criterio 1: registra el pago con el precio y el club del evento y deja la inscripción pagada", async () => {
    const { markPaidManually, rows, recorded } = setup(
      seatInfo({ priceCents: 2000, clubId: "club-9" }),
      [stored()],
    );

    const result = await markPaidManually(input);

    expect(result).toEqual({ alreadyPaid: false });
    expect(recorded).toEqual([
      {
        clubId: "club-9",
        registrationId: "reg-1",
        amountCents: 2000,
        reviewedByUserId: ORGANIZER_ID,
      },
    ]);
    expect(rows[0]!.status).toBe("paid");
  });

  it("HU-08 criterio 1: marcarla dos veces crea un solo pago", async () => {
    const { markPaidManually, recorded } = setup(seatInfo(), [stored()]);

    await markPaidManually(input);
    const second = await markPaidManually(input);

    expect(second).toEqual({ alreadyPaid: true });
    expect(recorded).toHaveLength(1);
  });

  it("HU-08 criterio 1: rechaza una inscripción de otra convocatoria", async () => {
    const { markPaidManually, recorded } = setup(seatInfo(), [stored({ eventId: "evt-2" })]);

    await expect(markPaidManually(input)).rejects.toThrow(RegistrationNotFoundError);
    expect(recorded).toHaveLength(0);
  });

  it("HU-08 criterio 1: rechaza una inscripción cancelada", async () => {
    const { markPaidManually, rows } = setup(seatInfo(), [stored({ status: "cancelled" })]);

    await expect(markPaidManually(input)).rejects.toThrow(RegistrationNotFoundError);
    expect(rows[0]!.status).toBe("cancelled");
  });

  it("HU-08 criterio 1: rechaza si la convocatoria está cancelada o no existe", async () => {
    const cancelled = setup(seatInfo({ status: "cancelled" }), [stored()]);
    await expect(cancelled.markPaidManually(input)).rejects.toThrow(EventNotOpenError);
    expect(cancelled.recorded).toHaveLength(0);

    const missing = setup(null, [stored()]);
    await expect(missing.markPaidManually(input)).rejects.toThrow(EventNotOpenError);
  });
});
