import { describe, expect, it } from "vitest";
import {
  EventNotOpenError,
  InvalidRejectionReasonError,
  NothingToReviewError,
} from "../domain/errors";
import type { EventSeatInfo, RegistrationStatus } from "../domain/registration";
import {
  fakeEventSeats,
  fakeRegistrationRepository,
  fakeTransactions,
  fakeVoucherReviews,
  seatInfo,
} from "./fakes";
import { makeApproveVoucher, makeRejectVoucher } from "./review-voucher";

function setup(status: RegistrationStatus, event: EventSeatInfo = seatInfo()) {
  const { seats } = fakeEventSeats(event);
  const { repository, rows } = fakeRegistrationRepository([
    {
      id: "reg-1",
      eventId: "evt-1",
      status,
      firstName: "Ana",
      lastName: "Paz",
      phone: "+51987654321",
      userId: null,
    },
  ]);
  const { reviews, approved, rejected } = fakeVoucherReviews({ "reg-1": "pay-1" });
  const deps = {
    events: seats,
    registrations: repository,
    reviews,
    transactions: fakeTransactions,
    now: () => new Date("2026-11-24T12:00:00Z"),
  };
  return {
    approveVoucher: makeApproveVoucher(deps),
    rejectVoucher: makeRejectVoucher(deps),
    rows,
    approved,
    rejected,
  };
}

const input = { eventId: "evt-1", registrationId: "reg-1", reviewedByUserId: "org-1" };

describe("HU-15 criterio 3: al aprobar, el estado pasa a pagado", () => {
  it("HU-15: aprueba el voucher y la inscripción queda pagada", async () => {
    const { approveVoucher, rows, approved } = setup("in_review");
    await approveVoucher(input);
    expect(approved).toEqual(["pay-1"]);
    expect(rows[0]?.status).toBe("paid");
  });

  it("HU-15: un segundo clic no aprueba dos veces", async () => {
    const { approveVoucher } = setup("in_review");
    await approveVoucher(input);
    await expect(approveVoucher(input)).rejects.toThrow(NothingToReviewError);
  });

  it("HU-15: no revisa vouchers de una convocatoria cancelada", async () => {
    const { approveVoucher } = setup("in_review", seatInfo({ status: "cancelled" }));
    await expect(approveVoucher(input)).rejects.toThrow(EventNotOpenError);
  });
});

describe("HU-15 criterio 2: rechazar con motivo", () => {
  it("HU-15: rechaza con el motivo y el jugador vuelve a pendiente de pago (conserva su cupo)", async () => {
    const { rejectVoucher, rows, rejected } = setup("in_review");
    await rejectVoucher({ ...input, reason: "  El monto no coincide " });
    expect(rejected).toEqual([{ paymentId: "pay-1", reason: "El monto no coincide" }]);
    expect(rows[0]?.status).toBe("pending_payment");
  });

  it("HU-15: el motivo es obligatorio", async () => {
    const { rejectVoucher, rejected } = setup("in_review");
    await expect(rejectVoucher({ ...input, reason: "   " })).rejects.toThrow(
      InvalidRejectionReasonError,
    );
    expect(rejected).toEqual([]);
  });

  it("HU-15: no rechaza si no hay voucher en revisión", async () => {
    const { rejectVoucher } = setup("pending_payment");
    await expect(rejectVoucher({ ...input, reason: "x" })).rejects.toThrow(NothingToReviewError);
  });
});
