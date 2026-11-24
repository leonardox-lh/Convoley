import { describe, expect, it } from "vitest";
import { EventFullError, EventNotOpenError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import { makeAddPlayerManually } from "./add-player-manually";
import {
  FAKE_TX,
  fakeEventSeats,
  fakeManualPayments,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeRegisterGuest } from "./register-guest";
import { makeRemoveRegistration } from "./remove-registration";

const NOW = new Date("2026-11-24T12:00:00Z");

const player = (name: string, phone: string) => ({
  eventId: "evt-1",
  firstName: name,
  lastName: "Paz",
  phone,
  userId: null,
});

function seated(id: string, phone: string): StoredRegistration {
  return { ...player(id, phone), id, status: "pending_payment" };
}

function setup(event: EventSeatInfo, existing: StoredRegistration[]) {
  const { seats, reopened } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository(existing);
  const deps = { events: seats, registrations: repository, transactions: fakeTransactions };
  return {
    rows,
    reopened,
    repository,
    registerGuest: makeRegisterGuest({
      ...deps,
      mercadoPago: { isEnabled: async () => false },
      now: () => NOW,
    }),
    removeRegistration: makeRemoveRegistration(deps),
    addPlayerManually: makeAddPlayerManually({
      ...deps,
      payments: fakeManualPayments().payments,
      now: () => NOW,
    }),
  };
}

/** A full event with one seat, taken by registration "a". */
const full = () => setup(seatInfo({ capacity: 1, status: "full" }), [seated("a", "+51911111111")]);
const statusOf = (rows: StoredRegistration[], phone: string) =>
  rows.find((row) => row.phone === phone)?.status;

describe("HU-12 criterio 1: orden por llegada", () => {
  it("HU-12: cada nuevo en la espera queda detrás del anterior", async () => {
    const { registerGuest } = full();
    const first = await registerGuest(player("Luz", "922222222"));
    const second = await registerGuest(player("Leo", "933333333"));
    expect([first.waitlistPosition, second.waitlistPosition]).toEqual([1, 2]);
  });

  it("HU-12: no hay espera si la convocatoria ya empezó o está cancelada", async () => {
    const started = setup(
      seatInfo({ status: "full", startsAt: new Date("2026-11-01T00:00:00Z") }),
      [],
    );
    await expect(started.registerGuest(player("Luz", "922222222"))).rejects.toThrow(
      EventNotOpenError,
    );
    const cancelled = setup(seatInfo({ status: "cancelled" }), []);
    await expect(cancelled.registerGuest(player("Luz", "922222222"))).rejects.toThrow(
      EventNotOpenError,
    );
  });
});

describe("HU-12 criterio 2: al liberarse un cupo pasa el primero automáticamente", () => {
  it("HU-12: quitar a un inscrito pasa al primero de la espera a pendiente de pago", async () => {
    const { registerGuest, removeRegistration, rows, reopened } = full();
    await registerGuest(player("Luz", "922222222"));
    await registerGuest(player("Leo", "933333333"));

    await removeRegistration({ eventId: "evt-1", registrationId: "a" });

    expect(statusOf(rows, "+51922222222")).toBe("pending_payment");
    expect(statusOf(rows, "+51933333333")).toBe("waitlisted");
    // The seat went to the waitlist, so the event stays full.
    expect(reopened).toEqual([]);
  });

  it("HU-12: si alguien sale de la espera, no se libera ningún cupo", async () => {
    const { registerGuest, removeRegistration, rows } = full();
    const luz = await registerGuest(player("Luz", "922222222"));
    await registerGuest(player("Leo", "933333333"));

    await removeRegistration({ eventId: "evt-1", registrationId: luz.id });

    expect(statusOf(rows, "+51911111111")).toBe("pending_payment");
    expect(statusOf(rows, "+51933333333")).toBe("waitlisted");
  });

  it("HU-12: el organizador no agrega a mano por encima del cupo", async () => {
    const { addPlayerManually } = full();
    await expect(
      addPlayerManually({ ...player("Luz", "922222222"), markPaid: false, organizerUserId: "o" }),
    ).rejects.toThrow(EventFullError);
  });
});

describe("HU-12 criterio 3: el jugador ve su posición en la espera", () => {
  it("HU-12: la posición avanza cuando el de adelante consigue cupo", async () => {
    const { registerGuest, removeRegistration, repository } = full();
    await registerGuest(player("Luz", "922222222"));
    const leo = await registerGuest(player("Leo", "933333333"));
    expect(leo.waitlistPosition).toBe(2);

    await removeRegistration({ eventId: "evt-1", registrationId: "a" });

    expect(await repository.waitlistPosition(leo.id, FAKE_TX)).toBe(1);
  });

  it("HU-12: quien tiene cupo no tiene posición de espera", async () => {
    const { repository } = full();
    expect(await repository.waitlistPosition("a", FAKE_TX)).toBeNull();
  });
});
