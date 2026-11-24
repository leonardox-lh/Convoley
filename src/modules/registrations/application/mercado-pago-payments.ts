import {
  EventNotOpenError,
  MercadoPagoUnavailableError,
  RegistrationNotFoundError,
} from "../domain/errors";
import { assertAwaitingPayment } from "../domain/registration";
import { settlementDecision, type Settlement } from "../domain/settlement";
import type {
  ChargeReport,
  EventSeats,
  MercadoPagoGateway,
  MercadoPagoPaymentRecords,
  RegistrationRepository,
  ServiceFees,
  TransactionRunner,
} from "./ports";
import { releaseExpiredReservations } from "./seats";

const PERUVIAN_SOLES = "PEN";
const SETTLEMENTS_THAT_REFUND: Settlement[] = ["refund", "refund_to_waitlist", "retry_refund"];

interface Deps {
  events: EventSeats;
  registrations: RegistrationRepository;
  gateway: MercadoPagoGateway;
  records: MercadoPagoPaymentRecords;
  transactions: TransactionRunner;
  now: () => Date;
}

interface StartDeps extends Deps {
  serviceFees: ServiceFees;
}

export type SettleResult = Settlement | "unknown_payment" | "mismatch";

/**
 * Applies Mercado Pago's answer to our payment and the player's seat (HU-20). Used by the
 * direct response of a charge and by the webhook: whichever comes second changes nothing.
 */
export function makeSettleMercadoPagoPayment(deps: Deps) {
  return async function settleMercadoPagoPayment(input: {
    clubId: string;
    report: ChargeReport;
  }): Promise<SettleResult> {
    const { report } = input;
    const payment =
      (await deps.records.find({ providerPaymentId: report.providerPaymentId })) ??
      (report.externalReference ? await deps.records.find({ id: report.externalReference }) : null);
    if (!payment?.registrationId) return "unknown_payment";
    // Only Mercado Pago's own data counts, and it must match what we asked to charge.
    const matches =
      payment.clubId === input.clubId &&
      payment.amountCents === report.amountCents &&
      report.currency === PERUVIAN_SOLES;
    if (!matches) return "mismatch";
    const registrationId = payment.registrationId;

    const decision = await deps.transactions.run(async (tx) => {
      const found = await deps.registrations.findById(registrationId, tx);
      if (!found) throw new RegistrationNotFoundError(registrationId);
      // The event lock serializes settlements, sign-ups and removals of this event.
      const locked = await deps.events.lock(found.eventId, tx);
      if (!locked) throw new EventNotOpenError(found.eventId);
      // A payment that lands after its reservation ended finds the seat released (HU-21).
      const event = await releaseExpiredReservations(deps, locked, deps.now(), tx);
      const registration = await deps.registrations.findInEvent(registrationId, event.id, tx);
      if (!registration) throw new RegistrationNotFoundError(registrationId);
      const current = await deps.records.find({ id: payment.id }, tx);
      if (!current) return "ignore" as const;
      const confirmed = await deps.registrations.countConfirmed(event.id, tx);

      const settlement = settlementDecision({
        charge: report.result,
        paymentStatus: current.status,
        registrationStatus: registration.status,
        eventCancelled: event.status === "cancelled",
        freeSeat:
          (event.status === "published" || event.status === "full") &&
          event.startsAt > deps.now() &&
          confirmed < event.capacity,
      });

      const setPayment = (status: "pending" | "approved" | "rejected" | "refund_pending") =>
        deps.records.setStatus(
          {
            paymentId: payment.id,
            status,
            statusDetail: report.statusDetail,
            providerPaymentId: report.providerPaymentId,
          },
          tx,
        );

      switch (settlement) {
        case "keep_pending":
          await setPayment("pending");
          break;
        case "mark_rejected":
          await setPayment("rejected");
          break;
        case "mark_paid":
          await setPayment("approved");
          await deps.registrations.setStatus(registrationId, "paid", tx);
          break;
        case "take_free_seat":
          await setPayment("approved");
          await deps.registrations.setStatus(registrationId, "paid", tx);
          if (confirmed + 1 >= event.capacity) await deps.events.markFull(event.id, tx);
          break;
        case "refund_to_waitlist":
          await setPayment("refund_pending");
          await deps.registrations.setStatus(registrationId, "waitlisted", tx);
          break;
        case "refund":
          await setPayment("refund_pending");
          break;
      }
      return settlement;
    });

    if (SETTLEMENTS_THAT_REFUND.includes(decision)) {
      // Outside the transaction: never hold the event lock during a network call. If this
      // fails the payment stays refund_pending and Mercado Pago's retry tries again.
      await deps.gateway.refund(input.clubId, report.providerPaymentId, `refund-${payment.id}`);
      await deps.records.setStatus({
        paymentId: payment.id,
        status: "refunded",
        statusDetail: report.statusDetail,
      });
    }
    return decision;
  };
}

/** HU-20: a webhook only says "payment X changed"; ask Mercado Pago what really happened. */
export function makeSettleMercadoPagoNotification(
  deps: Deps,
  settle: ReturnType<typeof makeSettleMercadoPagoPayment>,
) {
  return async function settleMercadoPagoNotification(input: {
    providerPaymentId: string;
    mpUserId: string | null;
  }): Promise<SettleResult> {
    const stored = await deps.records.find({ providerPaymentId: input.providerPaymentId });
    const clubId =
      stored?.clubId ??
      (input.mpUserId ? await deps.gateway.clubIdForAccount(input.mpUserId) : null);
    if (!clubId) return "unknown_payment";
    const report = await deps.gateway.find(clubId, input.providerPaymentId);
    return settle({ clubId, report });
  };
}

export interface StartMercadoPagoPaymentInput {
  registrationId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId: string | null;
  payerEmail: string;
}

/**
 * HU-19: the player pays with Yape or card without leaving the page. The amount comes from the
 * locked event, never from the browser; the charge goes to the organizer's own account.
 */
export function makeStartMercadoPagoPayment(
  deps: StartDeps,
  settle: ReturnType<typeof makeSettleMercadoPagoPayment>,
) {
  return async function startMercadoPagoPayment(input: StartMercadoPagoPaymentInput) {
    const pending = await deps.transactions.run(async (tx) => {
      const registration = await deps.registrations.findById(input.registrationId, tx);
      if (!registration) throw new RegistrationNotFoundError(input.registrationId);
      const locked = await deps.events.lock(registration.eventId, tx);
      if (!locked || locked.status === "cancelled") {
        throw new EventNotOpenError(registration.eventId);
      }
      if (locked.startsAt <= deps.now()) throw new EventNotOpenError(locked.id);
      // An expired reservation can't be paid: the seat may belong to someone else now (HU-21).
      const event = await releaseExpiredReservations(deps, locked, deps.now(), tx);
      const current = await deps.registrations.findInEvent(registration.id, event.id, tx);
      if (!current) throw new RegistrationNotFoundError(registration.id);
      assertAwaitingPayment(current);
      if (!(await deps.gateway.isEnabled(event.clubId))) {
        throw new MercadoPagoUnavailableError(event.clubId);
      }

      // HU-22: the player pays the club's service fee on top; it's recorded apart for reports.
      const serviceFeeCents = await deps.serviceFees.forCharge(event.clubId, event.priceCents);
      const amountCents = event.priceCents + serviceFeeCents;
      const { id } = await deps.records.recordPending(
        { clubId: event.clubId, registrationId: current.id, amountCents, serviceFeeCents },
        tx,
      );
      return { paymentId: id, clubId: event.clubId, amountCents };
    });

    const report = await deps.gateway.charge(pending.clubId, {
      amountCents: pending.amountCents,
      token: input.token,
      paymentMethodId: input.paymentMethodId,
      installments: input.installments,
      issuerId: input.issuerId,
      payerEmail: input.payerEmail,
      description: "Inscripción en Convoley",
      externalReference: pending.paymentId,
      // One key per attempt: a retried request never charges twice.
      idempotencyKey: pending.paymentId,
    });
    await deps.records.attachProviderId(pending.paymentId, report.providerPaymentId);
    const settlement = await settle({ clubId: pending.clubId, report });
    return { result: report.result, statusDetail: report.statusDetail, settlement };
  };
}
