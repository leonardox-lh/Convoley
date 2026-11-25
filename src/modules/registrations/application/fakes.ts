import { holdsSeat, type EventSeatInfo, type RegistrationStatus } from "../domain/registration";
import { NoCreditError } from "../domain/errors";
import type {
  ChargeReport,
  Credits,
  EventSeats,
  MercadoPagoGateway,
  MercadoPagoPaymentRecords,
  StoredMercadoPagoPayment,
  ManualPayments,
  VoucherPayments,
  VoucherReviews,
  RegistrationListItem,
  RegistrationListReader,
  PlayerDetails,
  PlayerRegistrations,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";

// Shared by the application tests: in-memory fakes with the same contract as the real ports.
export const FAKE_TX = { fake: true } as unknown as TransactionContext;

export const fakeTransactions: TransactionRunner = { run: (work) => work(FAKE_TX) };

export function seatInfo(overrides: Partial<EventSeatInfo> = {}): EventSeatInfo {
  return {
    id: "evt-1",
    clubId: "club-1",
    communityId: "community-1",
    status: "published",
    capacity: 18,
    priceCents: 1500,
    startsAt: new Date("2026-12-05T00:00:00Z"),
    ...overrides,
  };
}

export function fakeEventSeats(event: EventSeatInfo | null) {
  const markFull: string[] = [];
  const reopened: string[] = [];
  const seats: EventSeats = {
    lock: async () => event,
    markFull: async (eventId) => {
      markFull.push(eventId);
    },
    reopen: async (eventId) => {
      reopened.push(eventId);
    },
  };
  return { seats, markFull, reopened };
}

export interface StoredRegistration extends PlayerDetails {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  reservedUntil?: Date | null;
}

export function fakeRegistrationRepository(initial: StoredRegistration[] = []) {
  const rows = [...initial];
  const repository: RegistrationRepository = {
    countConfirmed: async (eventId) =>
      rows.filter((row) => row.eventId === eventId && holdsSeat(row.status)).length,
    findByPhone: async (eventId, phone) =>
      rows.find((row) => row.eventId === eventId && row.phone === phone) ?? null,
    create: async (eventId, player, status) => {
      const id = `reg-${rows.length + 1}`;
      rows.push({ id, eventId, status, ...player });
      return { id };
    },
    // Rows stay in arrival order: a reactivated sign-up moves to the end, like a new one.
    reactivate: async (id, player, status) => {
      const index = rows.findIndex((candidate) => candidate.id === id);
      const [row] = rows.splice(index, 1);
      rows.push(Object.assign(row!, player, { status, reservedUntil: null }));
    },
    promoteWaitlisted: async (eventId, seats) => {
      const waiting = rows.filter((row) => row.eventId === eventId && row.status === "waitlisted");
      waiting.slice(0, seats).forEach((row) => (row.status = "pending_payment"));
      return Math.min(seats, waiting.length);
    },
    waitlistPosition: async (id) => {
      const row = rows.find((candidate) => candidate.id === id);
      if (row?.status !== "waitlisted") return null;
      const waiting = rows.filter((r) => r.eventId === row.eventId && r.status === "waitlisted");
      return waiting.indexOf(row) + 1;
    },
    findInEvent: async (id, eventId) =>
      rows.find((row) => row.id === id && row.eventId === eventId) ?? null,
    findById: async (id) => rows.find((row) => row.id === id) ?? null,
    setStatus: async (id, status) => {
      Object.assign(
        rows.find((row) => row.id === id)!,
        { status, reservedUntil: null },
      );
    },
    reserve: async (id, until) => {
      rows.find((row) => row.id === id)!.reservedUntil = until;
    },
    releaseExpired: async (eventId, now) => {
      const expired = rows.filter(
        (row) =>
          row.eventId === eventId &&
          row.status === "pending_payment" &&
          row.reservedUntil != null &&
          row.reservedUntil <= now,
      );
      expired.forEach((row) => Object.assign(row, { status: "cancelled", reservedUntil: null }));
      return expired.length;
    },
  };
  return { repository, rows };
}

export function fakeCredits(options: { available?: boolean } = {}) {
  const used: string[] = [];
  const returned: string[] = [];
  const credits: Credits = {
    consume: async ({ registrationId }) => {
      if (!(options.available ?? true)) throw new NoCreditError();
      used.push(registrationId);
    },
    giveBack: async (registrationIds) => {
      returned.push(...registrationIds);
    },
  };
  return { credits, used, returned };
}

export function fakeRegistrationListReader(items: RegistrationListItem[]): RegistrationListReader {
  return { listByEvent: async () => [...items] };
}

export function fakeManualPayments() {
  const recorded: Parameters<ManualPayments["record"]>[0][] = [];
  const payments: ManualPayments = {
    record: async (payment) => {
      recorded.push(payment);
    },
  };
  return { payments, recorded };
}

export function fakePlayerRegistrations(rows: StoredRegistration[]) {
  const createdAt = new Date("2026-12-01T00:00:00Z");
  const registrations: PlayerRegistrations = {
    listByUser: async (userId) =>
      rows
        .filter((row) => row.userId === userId)
        .map(({ id, eventId, status }) => ({
          id,
          eventId,
          status,
          createdAt,
          waitlistPosition: null,
        })),
    linkGuestsToUser: async (phone, userId) => {
      const guests = rows.filter((row) => row.phone === phone && row.userId === null);
      guests.forEach((row) => (row.userId = userId));
      return guests.length;
    },
  };
  return { registrations, rows };
}

export function fakeVoucherPayments() {
  const stored: string[] = [];
  const recorded: Parameters<VoucherPayments["record"]>[0][] = [];
  const vouchers: VoucherPayments = {
    storeImage: async () => {
      const key = `voucher-${stored.length + 1}.jpg`;
      stored.push(key);
      return key;
    },
    record: async (payment) => {
      recorded.push(payment);
    },
  };
  return { vouchers, stored, recorded };
}

export function fakeVoucherReviews(inReview: Record<string, string>) {
  const approved: string[] = [];
  const rejected: { paymentId: string; reason: string }[] = [];
  const reviews: VoucherReviews = {
    findInReview: async (registrationId) =>
      inReview[registrationId] ? { id: inReview[registrationId] } : null,
    approve: async ({ paymentId }) => {
      approved.push(paymentId);
    },
    reject: async ({ paymentId, reason }) => {
      rejected.push({ paymentId, reason });
    },
  };
  return { reviews, approved, rejected };
}

/** Mercado Pago as seen from registrations: canned answers, records what was asked. */
export function fakeMercadoPagoGateway(
  options: {
    enabled?: boolean;
    answer?: Partial<ChargeReport>;
    accountClubs?: Record<string, string>;
  } = {},
) {
  const calls = {
    charged: [] as Parameters<MercadoPagoGateway["charge"]>[1][],
    refunded: [] as { providerPaymentId: string; idempotencyKey: string }[],
  };
  const report = (overrides: Partial<ChargeReport>): ChargeReport => ({
    providerPaymentId: "mp-1",
    result: "approved",
    statusDetail: "accredited",
    amountCents: 1500,
    currency: "PEN",
    externalReference: null,
    ...overrides,
  });
  const gateway: MercadoPagoGateway = {
    isEnabled: async () => options.enabled ?? true,
    charge: async (_clubId, charge) => {
      calls.charged.push(charge);
      return report({
        amountCents: charge.amountCents,
        externalReference: charge.externalReference,
        ...options.answer,
      });
    },
    find: async (_clubId, providerPaymentId) => report({ providerPaymentId, ...options.answer }),
    refund: async (_clubId, providerPaymentId, idempotencyKey) => {
      calls.refunded.push({ providerPaymentId, idempotencyKey });
    },
    clubIdForAccount: async (mpUserId) => options.accountClubs?.[mpUserId] ?? null,
  };
  return { gateway, calls, report };
}

export function fakeMercadoPagoRecords(initial: StoredMercadoPagoPayment[] = []) {
  const rows = [...initial];
  const records: MercadoPagoPaymentRecords = {
    recordPending: async (payment) => {
      const id = `pay-${rows.length + 1}`;
      rows.push({ id, ...payment, status: "pending", providerPaymentId: null });
      return { id };
    },
    attachProviderId: async (paymentId, providerPaymentId) => {
      rows.find((row) => row.id === paymentId)!.providerPaymentId = providerPaymentId;
    },
    find: async (where) =>
      rows.find((row) =>
        "id" in where ? row.id === where.id : row.providerPaymentId === where.providerPaymentId,
      ) ?? null,
    setStatus: async ({ paymentId, status, providerPaymentId }) => {
      const row = rows.find((candidate) => candidate.id === paymentId)!;
      row.status = status;
      if (providerPaymentId) row.providerPaymentId = providerPaymentId;
    },
  };
  return { records, rows };
}
