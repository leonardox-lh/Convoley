import { describe, expect, it } from "vitest";
import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import {
  fakeEventSeats,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeRegisterGuest } from "./register-guest";
import { makeRemoveRegistration } from "./remove-registration";

const NOW = new Date("2026-11-24T12:00:00Z");

function stored(id: string, phone: string, overrides: Partial<StoredRegistration> = {}) {
  return {
    id,
    eventId: "evt-1",
    status: "pending_payment",
    firstName: "Ana",
    lastName: "Perez",
    phone,
    userId: null,
    ...overrides,
  } as StoredRegistration;
}

function setup(event: EventSeatInfo | null, existing: StoredRegistration[]) {
  const { seats, reopened } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository(existing);
  const removeRegistration = makeRemoveRegistration({
    events: seats,
    registrations: repository,
    transactions: fakeTransactions,
  });
  const registerGuest = makeRegisterGuest({
    events: seats,
    registrations: repository,
    transactions: fakeTransactions,
    now: () => NOW,
  });
  const confirmed = () => rows.filter((row) => row.status !== "cancelled").length;
  return { removeRegistration, registerGuest, rows, reopened, confirmed };
}

const input = { eventId: "evt-1", registrationId: "reg-1" };
const newcomer = {
  eventId: "evt-1",
  firstName: "Luz",
  lastName: "Diaz",
  phone: "933333333",
  userId: null,
};

describe("HU-08 criterio 2: quitar a alguien libera su cupo", () => {
  it("HU-08 criterio 2: la inscripción queda cancelada y los ocupados bajan en uno", async () => {
    const { removeRegistration, rows, reopened, confirmed } = setup(seatInfo(), [
      stored("reg-1", "+51911111111"),
      stored("reg-2", "+51922222222"),
    ]);

    await removeRegistration(input);

    expect(rows[0]!.status).toBe("cancelled");
    expect(confirmed()).toBe(1);
    expect(reopened).toEqual([]);
  });

  it("HU-08 criterio 2: si la convocatoria estaba llena, la reabre", async () => {
    const { removeRegistration, reopened } = setup(seatInfo({ status: "full" }), [
      stored("reg-1", "+51911111111"),
    ]);

    await removeRegistration(input);

    expect(reopened).toEqual(["evt-1"]);
  });

  it("HU-08 criterio 2: quitarla dos veces no hace nada la segunda vez", async () => {
    const { removeRegistration, reopened } = setup(seatInfo({ status: "full" }), [
      stored("reg-1", "+51911111111"),
    ]);

    await removeRegistration(input);
    await removeRegistration(input);

    expect(reopened).toHaveLength(1);
  });

  it("HU-08 criterio 2: con el cupo lleno, el lugar liberado lo toma otra persona", async () => {
    const { removeRegistration, registerGuest, rows, confirmed } = setup(
      seatInfo({ capacity: 1 }),
      [stored("reg-1", "+51911111111")],
    );
    expect((await registerGuest(newcomer)).status).toBe("waitlisted");

    await removeRegistration(input);

    expect(confirmed()).toBe(1);
    expect(rows.find((row) => row.phone === "+51933333333")?.status).toBe("pending_payment");
  });

  it("HU-08 criterio 2: rechaza una inscripción de otra convocatoria o inexistente", async () => {
    const { removeRegistration } = setup(seatInfo(), [
      stored("reg-1", "+51911111111", { eventId: "evt-2" }),
    ]);

    await expect(removeRegistration(input)).rejects.toThrow(RegistrationNotFoundError);
    await expect(removeRegistration({ ...input, registrationId: "nope" })).rejects.toThrow(
      RegistrationNotFoundError,
    );
  });

  it("HU-08 criterio 2: rechaza si la convocatoria no existe", async () => {
    const { removeRegistration } = setup(null, []);

    await expect(removeRegistration(input)).rejects.toThrow(EventNotOpenError);
  });

  it("HU-08 criterio 2: rechaza si la convocatoria está cancelada", async () => {
    const { removeRegistration } = setup(seatInfo({ status: "cancelled" }), []);

    await expect(removeRegistration(input)).rejects.toThrow(EventNotOpenError);
  });
});
