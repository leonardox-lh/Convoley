import { describe, expect, it } from "vitest";
import {
  DuplicatePlayerNameError,
  DuplicateRegistrationError,
  EventFullError,
  InvalidPhoneNumberError,
} from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import { makeAddPlayerManually } from "./add-player-manually";
import {
  fakeEventSeats,
  fakeManualPayments,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";

const NOW = new Date("2026-11-24T12:00:00Z");
const input = {
  eventId: "evt-1",
  firstName: "Ana",
  lastName: "Perez",
  phone: "987 654 321",
  markPaid: false,
  organizerUserId: "user-1",
};

function setup(event: EventSeatInfo, existing: StoredRegistration[] = []) {
  const { seats } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository(existing);
  const { payments, recorded } = fakeManualPayments();
  const addPlayerManually = makeAddPlayerManually({
    events: seats,
    registrations: repository,
    payments,
    transactions: fakeTransactions,
    now: () => NOW,
  });
  return { addPlayerManually, rows, recorded };
}

const existingRow: StoredRegistration = {
  id: "reg-old",
  eventId: "evt-1",
  status: "paid",
  firstName: "Otra",
  lastName: "Persona",
  phone: "+51987654321",
  userId: null,
};

describe("HU-08 criterio 1: agregar jugador manualmente y marcar pagado", () => {
  it("HU-08 criterio 1: con 'ya pagó' queda pagado y registra un solo pago por el precio", async () => {
    const { addPlayerManually, rows, recorded } = setup(seatInfo({ priceCents: 1800 }));

    const result = await addPlayerManually({ ...input, markPaid: true });

    expect(result).toEqual({ id: "reg-1", status: "paid" });
    expect(rows[0]).toMatchObject({ phone: "+51987654321", status: "paid", userId: null });
    expect(recorded).toEqual([
      { clubId: "club-1", registrationId: "reg-1", amountCents: 1800, reviewedByUserId: "user-1" },
    ]);
  });

  it("HU-08 criterio 1: sin 'ya pagó' queda pendiente de pago y no registra pago", async () => {
    const { addPlayerManually, rows, recorded } = setup(seatInfo());

    const result = await addPlayerManually(input);

    expect(result).toEqual({ id: "reg-1", status: "pending_payment" });
    expect(rows[0]!.status).toBe("pending_payment");
    expect(recorded).toHaveLength(0);
  });

  it("HU-08 criterio 1: rechaza el celular repetido sin registrar pago", async () => {
    const { addPlayerManually, recorded } = setup(seatInfo(), [existingRow]);

    await expect(addPlayerManually({ ...input, markPaid: true })).rejects.toThrow(
      DuplicateRegistrationError,
    );
    expect(recorded).toHaveLength(0);
  });

  it("HU-08 criterio 1: rechaza si la convocatoria está llena o sin cupo, sin registrar pago", async () => {
    const full = setup(seatInfo({ status: "full" }));
    await expect(full.addPlayerManually({ ...input, markPaid: true })).rejects.toThrow(
      EventFullError,
    );
    expect(full.recorded).toHaveLength(0);

    const noSeats = setup(seatInfo({ capacity: 1 }), [{ ...existingRow, phone: "+51911111111" }]);
    await expect(noSeats.addPlayerManually(input)).rejects.toThrow(EventFullError);
  });

  it("HU-08 criterio 1: rechaza un celular inválido", async () => {
    const { addPlayerManually, rows } = setup(seatInfo());

    await expect(addPlayerManually({ ...input, phone: "12345" })).rejects.toThrow(
      InvalidPhoneNumberError,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("agregar jugador solo con el nombre", () => {
  it("se agrega sin apellido ni celular", async () => {
    const { addPlayerManually, rows } = setup(seatInfo());

    await addPlayerManually({ ...input, lastName: "", phone: null });

    expect(rows[0]).toMatchObject({ firstName: "Ana", lastName: "", phone: null });
  });

  it("rechaza un nombre que ya está en la lista, sin registrar pago", async () => {
    const { addPlayerManually, rows, recorded } = setup(seatInfo(), [existingRow]);

    await expect(
      addPlayerManually({
        ...input,
        firstName: "otra",
        lastName: "PERSONA",
        phone: null,
        markPaid: true,
      }),
    ).rejects.toThrow(DuplicatePlayerNameError);
    expect(rows).toHaveLength(1);
    expect(recorded).toHaveLength(0);
  });
});
