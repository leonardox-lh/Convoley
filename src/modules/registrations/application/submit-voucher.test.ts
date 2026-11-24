import { describe, expect, it } from "vitest";
import {
  EventNotOpenError,
  PaymentNotExpectedError,
  RegistrationNotFoundError,
} from "../domain/errors";
import type { EventSeatInfo, RegistrationStatus } from "../domain/registration";
import {
  fakeEventSeats,
  fakeRegistrationRepository,
  fakeTransactions,
  fakeVoucherPayments,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import { makeSubmitVoucher } from "./submit-voucher";

function stored(status: RegistrationStatus): StoredRegistration {
  return {
    id: "reg-1",
    eventId: "evt-1",
    status,
    firstName: "Ana",
    lastName: "Paz",
    phone: "+51987654321",
    userId: null,
  };
}

function setup(event: EventSeatInfo | null, registration: StoredRegistration) {
  const { seats } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository([registration]);
  const { vouchers, stored: files, recorded } = fakeVoucherPayments();
  const submitVoucher = makeSubmitVoucher({
    events: seats,
    registrations: repository,
    vouchers,
    transactions: fakeTransactions,
  });
  return { submitVoucher, rows, files, recorded };
}

const input = {
  registrationId: "reg-1",
  image: { bytes: new Uint8Array(10), contentType: "image/jpeg" },
  yapeSecurityCode: null,
};

describe("HU-14 criterio 1: subir la captura del pago", () => {
  it("HU-14: guarda la imagen y registra un pago por voucher del precio de la convocatoria", async () => {
    const { submitVoucher, files, recorded } = setup(
      seatInfo({ priceCents: 1500 }),
      stored("pending_payment"),
    );
    await submitVoucher(input);
    expect(files).toEqual(["voucher-1.jpg"]);
    expect(recorded).toEqual([
      {
        clubId: "club-1",
        registrationId: "reg-1",
        amountCents: 1500,
        proofFileKey: "voucher-1.jpg",
        yapeSecurityCode: null,
      },
    ]);
  });
});

describe("HU-14 criterio 2: código de seguridad opcional", () => {
  it("HU-14: guarda el código de Yape con el pago", async () => {
    const { submitVoucher, recorded } = setup(seatInfo(), stored("pending_payment"));
    await submitVoucher({ ...input, yapeSecurityCode: "482" });
    expect(recorded[0]?.yapeSecurityCode).toBe("482");
  });
});

describe("HU-14 criterio 3: el estado pasa a en revisión", () => {
  it("HU-14: la inscripción queda en revisión", async () => {
    const { submitVoucher, rows } = setup(seatInfo(), stored("pending_payment"));
    await submitVoucher(input);
    expect(rows[0]?.status).toBe("in_review");
  });

  it.each(["in_review", "paid", "waitlisted", "cancelled"] as const)(
    "HU-14: una inscripción %s no recibe voucher ni guarda archivos",
    async (status) => {
      const { submitVoucher, files } = setup(seatInfo(), stored(status));
      await expect(submitVoucher(input)).rejects.toThrow(PaymentNotExpectedError);
      expect(files).toEqual([]);
    },
  );

  it("HU-14: no recibe voucher si la convocatoria se canceló", async () => {
    const { submitVoucher } = setup(seatInfo({ status: "cancelled" }), stored("pending_payment"));
    await expect(submitVoucher(input)).rejects.toThrow(EventNotOpenError);
  });

  it("HU-14: falla con una inscripción que no existe", async () => {
    const { submitVoucher } = setup(seatInfo(), stored("pending_payment"));
    await expect(submitVoucher({ ...input, registrationId: "nope" })).rejects.toThrow(
      RegistrationNotFoundError,
    );
  });
});
