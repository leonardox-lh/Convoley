import { describe, expect, it } from "vitest";
import type { RegistrationStatus } from "../domain/registration";
import { fakeRegistrationListReader } from "./fakes";
import { makeListEventRegistrations } from "./list-event-registrations";

function item(id: string, status: RegistrationStatus, minute: number) {
  return {
    id,
    firstName: id,
    lastName: "Perez",
    phone: "+51900000000",
    status,
    createdAt: new Date(Date.UTC(2026, 11, 1, 10, minute)),
  };
}

const rows = [
  item("third", "paid", 30),
  item("first", "pending_payment", 5),
  item("cancelled", "cancelled", 10),
  item("second", "in_review", 20),
];
const list = makeListEventRegistrations({ registrations: fakeRegistrationListReader(rows) });
const ids = (result: { id: string }[]) => result.map((row) => row.id);

describe("HU-07 criterio 1: ordenada por hora de inscripción", () => {
  it("HU-07 criterio 1: devuelve los inscritos del más antiguo al más reciente", async () => {
    expect(ids(await list({ eventId: "evt-1" }))).toEqual(["first", "second", "third"]);
  });

  it("HU-07 criterio 1: sin inscritos devuelve una lista vacía", async () => {
    const empty = makeListEventRegistrations({ registrations: fakeRegistrationListReader([]) });
    expect(await empty({ eventId: "evt-1" })).toEqual([]);
  });
});

describe("HU-07 criterio 2: filtro por estado de pago", () => {
  it("HU-07 criterio 2: sin filtro oculta los cancelados", async () => {
    expect(ids(await list({ eventId: "evt-1" }))).not.toContain("cancelled");
  });

  it.each([
    ["pending_payment", ["first"]],
    ["in_review", ["second"]],
    ["paid", ["third"]],
    ["cancelled", ["cancelled"]],
  ] as const)(
    "HU-07 criterio 2: el filtro %s devuelve solo ese estado",
    async (status, expected) => {
      expect(ids(await list({ eventId: "evt-1", status }))).toEqual(expected);
    },
  );
});
