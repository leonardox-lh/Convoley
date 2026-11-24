import type { EventDetails, EventRepository, TransactionContext, TransactionRunner } from "./ports";

// Shared by the application tests: fakes of the ports with the same contract as the real ones.
export const FAKE_TX = { fake: true } as unknown as TransactionContext;

export const fakeTransactions: TransactionRunner = { run: (work) => work(FAKE_TX) };

export function fakeEventRepository(overrides: Partial<EventRepository> = {}): EventRepository {
  return {
    create: async () => ({ id: "evt-1" }),
    findInClub: async () => null,
    lockInClub: async () => null,
    update: async () => undefined,
    markCancelled: async () => undefined,
    ...overrides,
  };
}

export const CLUB = {
  id: "club-1",
  slug: "voley",
  name: "Voley",
  communities: [{ id: "com-1", name: "General" }],
};

export function eventDetails(overrides: Partial<EventDetails> = {}): EventDetails {
  return {
    id: "evt-1",
    clubId: "club-1",
    communityId: "com-1",
    communityName: "General",
    title: "Mixto",
    startsAt: new Date("2026-12-05T00:00:00Z"),
    venueName: "Coliseo",
    mapsUrl: null,
    priceCents: 1500,
    capacity: 18,
    isMixed: false,
    rules: null,
    status: "published",
    cancellationOutcome: null,
    ...overrides,
  };
}
