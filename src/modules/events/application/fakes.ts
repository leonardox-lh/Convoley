import type {
  EventDetails,
  EventRepository,
  SavedVenue,
  TransactionContext,
  TransactionRunner,
  VenueBook,
} from "./ports";

// Shared by the application tests: fakes of the ports with the same contract as the real ones.
export const FAKE_TX = { fake: true } as unknown as TransactionContext;

export const fakeTransactions: TransactionRunner = { run: (work) => work(FAKE_TX) };

export function fakeEventRepository(overrides: Partial<EventRepository> = {}): EventRepository {
  return {
    create: async () => ({ id: "evt-1" }),
    findInClub: async () => null,
    listInClub: async () => [],
    listUpcoming: async () => [],
    lockInClub: async () => null,
    update: async () => undefined,
    markCancelled: async () => undefined,
    ...overrides,
  };
}

/** In memory, same rules as the Prisma one: one entry per club and name, newest first. */
export function fakeVenueBook() {
  const rows: (SavedVenue & { clubId: string; usedAt: number })[] = [];
  let clock = 0;
  const book: VenueBook = {
    remember: async (clubId, { name, mapsUrl }) => {
      clock += 1;
      const existing = rows.find((row) => row.clubId === clubId && row.name === name.trim());
      if (!existing) {
        rows.push({ id: `venue-${clock}`, clubId, name: name.trim(), mapsUrl, usedAt: clock });
        return;
      }
      existing.usedAt = clock;
      if (mapsUrl) existing.mapsUrl = mapsUrl;
    },
    listInClub: async (clubId) =>
      rows
        .filter((row) => row.clubId === clubId)
        .sort((a, b) => b.usedAt - a.usedAt)
        .map(({ id, name, mapsUrl }) => ({ id, name, mapsUrl })),
    remove: async (clubId, venueId) => {
      const index = rows.findIndex((row) => row.id === venueId && row.clubId === clubId);
      if (index >= 0) rows.splice(index, 1);
    },
  };
  return book;
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
    category: "men" as const,
    rules: null,
    status: "published",
    cancellationOutcome: null,
    ...overrides,
  };
}
