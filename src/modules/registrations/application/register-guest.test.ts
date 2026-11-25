import { describe, expect, it } from "vitest";
import {
  DuplicateRegistrationError,
  EventNotOpenError,
  InvalidPhoneNumberError,
} from "../domain/errors";
import {
  fakeEventSeats,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeRegisterGuest } from "./register-guest";
import type { EventSeatInfo } from "../domain/registration";

const NOW = new Date("2026-11-24T12:00:00Z");
const input = {
  eventId: "evt-1",
  firstName: "Ana",
  lastName: "Perez",
  phone: "987 654 321",
  userId: null,
};

function setup(event: EventSeatInfo | null, existing: StoredRegistration[] = []) {
  const { seats, markFull } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository(existing);
  const registerGuest = makeRegisterGuest({
    events: seats,
    registrations: repository,
    mercadoPago: { isEnabled: async () => false },
    transactions: fakeTransactions,
    now: () => NOW,
  });
  return { registerGuest, markFull, rows };
}

function stored(overrides: Partial<StoredRegistration> = {}): StoredRegistration {
  return {
    id: "reg-old",
    eventId: "evt-1",
    status: "pending_payment",
    firstName: "Otra",
    lastName: "Persona",
    phone: "+51987654321",
    userId: null,
    ...overrides,
  };
}

describe("HU-06 criterio 2: invitado con celular, sin cuenta", () => {
  it("HU-06: crea la inscripción pendiente de pago con celular normalizado y sin usuario", async () => {
    const { registerGuest, rows } = setup(seatInfo());

    const result = await registerGuest(input);

    expect(result).toEqual({
      id: "reg-1",
      status: "pending_payment",
      waitlistPosition: null,
      reservedUntil: null,
    });
    expect(rows).toEqual([
      {
        id: "reg-1",
        eventId: "evt-1",
        status: "pending_payment",
        firstName: "Ana",
        lastName: "Perez",
        phone: "+51987654321",
        userId: null,
        position: null,
        level: null,
        gender: null,
      },
    ]);
  });

  it("HU-06: un celular inválido se rechaza y no inscribe", async () => {
    const { registerGuest, rows } = setup(seatInfo());

    await expect(registerGuest({ ...input, phone: "12345" })).rejects.toThrow(
      InvalidPhoneNumberError,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("HU-06 criterio 3: el mismo celular no se repite en la convocatoria", () => {
  it.each(["pending_payment", "in_review", "paid"] as const)(
    "HU-06: rechaza el celular ya inscrito (%s), aunque lo escriban distinto",
    async (status) => {
      const { registerGuest, rows } = setup(seatInfo(), [stored({ status })]);

      await expect(registerGuest({ ...input, phone: "+51 987-654-321" })).rejects.toThrow(
        DuplicateRegistrationError,
      );
      expect(rows).toHaveLength(1);
    },
  );

  it("HU-06: un celular cancelado se reactiva con el mismo id", async () => {
    const { registerGuest, rows } = setup(seatInfo(), [stored({ status: "cancelled" })]);

    const result = await registerGuest(input);

    expect(result.id).toBe("reg-old");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "pending_payment", firstName: "Ana" });
  });

  it("HU-06: el mismo celular en otra convocatoria sí se permite", async () => {
    const { registerGuest, rows } = setup(seatInfo(), [stored({ eventId: "evt-2" })]);

    await registerGuest(input);

    expect(rows).toHaveLength(2);
  });
});

describe("HU-06 criterio 4: queda pendiente de pago", () => {
  it("HU-06: el resultado informa el estado pending_payment", async () => {
    const { registerGuest } = setup(seatInfo());
    expect((await registerGuest(input)).status).toBe("pending_payment");
  });
});

describe("HU-06: cupos y estado de la convocatoria", () => {
  it("HU-12: con el cupo lleno entra a la lista de espera en vez de fallar", async () => {
    const existing = [
      stored({ phone: "+51911111111" }),
      stored({ id: "r2", phone: "+51922222222" }),
    ];
    const { registerGuest, markFull } = setup(seatInfo({ capacity: 2 }), existing);

    expect(await registerGuest(input)).toEqual({
      id: "reg-3",
      status: "waitlisted",
      waitlistPosition: 1,
      reservedUntil: null,
    });
    expect(markFull).toEqual([]);
  });

  it("HU-12: una convocatoria en estado full manda a la lista de espera", async () => {
    const { registerGuest } = setup(seatInfo({ status: "full" }));
    expect((await registerGuest(input)).status).toBe("waitlisted");
  });

  it.each(["draft", "cancelled"])(
    "HU-06: una convocatoria %s no recibe inscripciones",
    async (status) => {
      const { registerGuest } = setup(seatInfo({ status }));
      await expect(registerGuest(input)).rejects.toThrow(EventNotOpenError);
    },
  );

  it("HU-06: una convocatoria pasada no recibe inscripciones", async () => {
    const { registerGuest } = setup(seatInfo({ startsAt: new Date("2026-11-01T00:00:00Z") }));
    await expect(registerGuest(input)).rejects.toThrow(EventNotOpenError);
  });

  it("HU-06: una convocatoria inexistente lanza EventNotOpenError", async () => {
    const { registerGuest } = setup(null);
    await expect(registerGuest(input)).rejects.toThrow(EventNotOpenError);
  });

  it("HU-06: al tomar el último cupo marca la convocatoria como llena", async () => {
    const { registerGuest, markFull } = setup(seatInfo({ capacity: 2 }), [
      stored({ phone: "+51911111111" }),
    ]);

    await registerGuest(input);

    expect(markFull).toEqual(["evt-1"]);
  });

  it("HU-06: si quedan más cupos no la marca como llena", async () => {
    const { registerGuest, markFull } = setup(seatInfo({ capacity: 3 }), [
      stored({ phone: "+51911111111" }),
    ]);

    await registerGuest(input);

    expect(markFull).toEqual([]);
  });

  it("HU-06: reactivar el último cupo también marca la convocatoria como llena", async () => {
    const { registerGuest, markFull } = setup(seatInfo({ capacity: 1 }), [
      stored({ status: "cancelled" }),
    ]);

    await registerGuest(input);

    expect(markFull).toEqual(["evt-1"]);
  });
});

describe("HU-10: posición y nivel opcionales al inscribirse", () => {
  it("HU-10 criterios 1 y 2: guarda la posición y el nivel elegidos", async () => {
    const { registerGuest, rows } = setup(seatInfo());
    await registerGuest({ ...input, position: "setter", level: "intermediate" });
    expect(rows[0]).toMatchObject({ position: "setter", level: "intermediate" });
  });

  it("HU-10: son opcionales", async () => {
    const { registerGuest, rows } = setup(seatInfo());
    await registerGuest(input);
    expect(rows[0]).toMatchObject({ position: null, level: null });
  });
});

describe("inscripción solo con el nombre", () => {
  it("se inscribe sin celular ni apellido", async () => {
    const { registerGuest, rows } = setup(seatInfo());
    await registerGuest({ eventId: "evt-1", firstName: "Ana", lastName: "", userId: null });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstName: "Ana", lastName: "", phone: null });
  });

  it("dos invitados sin celular pueden inscribirse a la misma convocatoria", async () => {
    const { registerGuest, rows } = setup(seatInfo());
    const guest = { eventId: "evt-1", lastName: "", userId: null };
    await registerGuest({ ...guest, firstName: "Ana" });
    await registerGuest({ ...guest, firstName: "Luz" });
    expect(rows).toHaveLength(2);
  });

  it("una cuenta de Google sin celular no se inscribe dos veces", async () => {
    const { registerGuest } = setup(seatInfo(), [
      stored({ phone: null, userId: "user-1", firstName: "Ana" }),
    ]);
    await expect(
      registerGuest({ eventId: "evt-1", firstName: "Ana", lastName: "", userId: "user-1" }),
    ).rejects.toThrow(DuplicateRegistrationError);
  });
});
