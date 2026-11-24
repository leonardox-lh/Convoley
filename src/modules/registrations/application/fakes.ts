import type { EventSeatInfo, RegistrationStatus } from "../domain/registration";
import type {
  EventSeats,
  PlayerDetails,
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
    status: "published",
    capacity: 18,
    startsAt: new Date("2026-12-05T00:00:00Z"),
    ...overrides,
  };
}

export function fakeEventSeats(event: EventSeatInfo | null) {
  const markFull: string[] = [];
  const seats: EventSeats = {
    lock: async () => event,
    markFull: async (eventId) => {
      markFull.push(eventId);
    },
  };
  return { seats, markFull };
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
  };
  return { repository, rows };
}
