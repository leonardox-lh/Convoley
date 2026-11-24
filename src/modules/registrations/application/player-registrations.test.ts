import { describe, expect, it } from "vitest";
import { fakePlayerRegistrations, type StoredRegistration } from "./fakes";
import { makeLinkGuestRegistrations, makeListPlayerRegistrations } from "./player-registrations";

const row = (overrides: Partial<StoredRegistration>): StoredRegistration => ({
  id: "reg-1",
  eventId: "evt-1",
  firstName: "Ana",
  lastName: "Paz",
  phone: "+51987654321",
  userId: null,
  status: "pending_payment",
  ...overrides,
});

describe("HU-48 criterio 4: vincula las inscripciones de invitado", () => {
  it("HU-48: las inscripciones como invitado con ese celular pasan a la cuenta", async () => {
    const { registrations, rows } = fakePlayerRegistrations([
      row({ id: "reg-1" }),
      row({ id: "reg-2", eventId: "evt-2" }),
      row({ id: "reg-3", phone: "+51911111111" }),
    ]);
    const linked = await makeLinkGuestRegistrations({ registrations })({
      userId: "user-1",
      phone: "987 654 321",
    });
    expect(linked).toBe(2);
    expect(rows.map((r) => r.userId)).toEqual(["user-1", "user-1", null]);
  });

  it("HU-48: no toma inscripciones que ya son de otra cuenta", async () => {
    const { registrations, rows } = fakePlayerRegistrations([row({ userId: "user-2" })]);
    await makeLinkGuestRegistrations({ registrations })({
      userId: "user-1",
      phone: "987654321",
    });
    expect(rows[0].userId).toBe("user-2");
  });
});

describe("HU-48 criterio 5: Mis inscripciones con su estado de pago", () => {
  it("HU-48: lista las inscripciones de la cuenta con su estado, sin las canceladas", async () => {
    const { registrations } = fakePlayerRegistrations([
      row({ id: "reg-1", userId: "user-1", status: "paid" }),
      row({ id: "reg-2", userId: "user-1", status: "cancelled" }),
      row({ id: "reg-3", userId: "user-2" }),
    ]);
    const list = await makeListPlayerRegistrations({ registrations })("user-1");
    expect(list.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "reg-1", status: "paid" },
    ]);
  });
});
