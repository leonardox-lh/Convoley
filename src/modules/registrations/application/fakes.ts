import type { EventSeatInfo, RegistrationStatus } from "../domain/registration";
import type {
  EventSeats,
  ManualPayments,
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
}

export function fakeRegistrationRepository(initial: StoredRegistration[] = []) {
  const rows = [...initial];
  const repository: RegistrationRepository = {
    countConfirmed: async (eventId) =>
      rows.filter((row) => row.eventId === eventId && row.status !== "cancelled").length,
    findByPhone: async (eventId, phone) =>
      rows.find((row) => row.eventId === eventId && row.phone === phone) ?? null,
    create: async (eventId, player) => {
      const id = `reg-${rows.length + 1}`;
      rows.push({ id, eventId, status: "pending_payment", ...player });
      return { id };
    },
    reactivate: async (id, player) => {
      const row = rows.find((candidate) => candidate.id === id)!;
      Object.assign(row, player, { status: "pending_payment" });
    },
    findInEvent: async (id, eventId) =>
      rows.find((row) => row.id === id && row.eventId === eventId) ?? null,
    setStatus: async (id, status) => {
      rows.find((row) => row.id === id)!.status = status;
    },
  };
  return { repository, rows };
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
        .map(({ id, eventId, status }) => ({ id, eventId, status, createdAt })),
    linkGuestsToUser: async (phone, userId) => {
      const guests = rows.filter((row) => row.phone === phone && row.userId === null);
      guests.forEach((row) => (row.userId = userId));
      return guests.length;
    },
  };
  return { registrations, rows };
}
