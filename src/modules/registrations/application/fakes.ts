import { holdsSeat, type EventSeatInfo, type RegistrationStatus } from "../domain/registration";
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
      rows.push(Object.assign(row!, player, { status }));
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
