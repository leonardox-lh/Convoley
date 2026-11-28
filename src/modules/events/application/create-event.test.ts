import { describe, expect, it } from "vitest";
import { ClubNotFoundError, CommunityNotInClubError, EventInPastError } from "../domain/errors";
import type { NewEvent } from "../domain/event";
import { makeCreateEvent, type CreateEventInput } from "./create-event";
import { fakeEventRepository, fakeVenueBook } from "./fakes";
import type { ClubReader, EventRepository } from "./ports";

const NOW = new Date("2026-12-01T12:00:00.000Z");
const club = {
  id: "club-1",
  slug: "voley-miraflores",
  name: "Voley Miraflores",
  communities: [{ id: "com-1", name: "General" }],
};

function setup() {
  const saved: NewEvent[] = [];
  const clubs: ClubReader = { findBySlug: async (slug) => (slug === club.slug ? club : null) };
  const events: EventRepository = fakeEventRepository({
    create: async (event) => {
      saved.push(event);
      return { id: "evt-1" };
    },
  });
  const venues = fakeVenueBook();
  return { saved, venues, createEvent: makeCreateEvent({ clubs, events, venues, now: () => NOW }) };
}

const input = (overrides: Partial<CreateEventInput> = {}): CreateEventInput => ({
  clubSlug: club.slug,
  communityId: "com-1",
  title: "Mixto",
  startsAt: new Date("2026-12-05T00:00:00Z"),
  venueName: "Coliseo",
  mapsUrl: null,
  priceCents: 1500,
  capacity: 18,
  category: "men" as const,
  rules: null,
  status: "published",
  ...overrides,
});

describe("HU-04: createEvent", () => {
  it("HU-04: genera el link para compartir /c/<club>/<id>", async () => {
    const { createEvent, saved } = setup();
    const result = await createEvent(input());
    expect(result).toEqual({ id: "evt-1", sharePath: "/c/voley-miraflores/evt-1" });
    expect(saved[0]).toMatchObject({ clubId: "club-1", status: "published", priceCents: 1500 });
  });

  it("HU-04: guarda en borrador cuando se pide borrador", async () => {
    const { createEvent, saved } = setup();
    await createEvent(input({ status: "draft" }));
    expect(saved[0]?.status).toBe("draft");
  });

  it("HU-04: club inexistente falla y no guarda", async () => {
    const { createEvent, saved } = setup();
    await expect(createEvent(input({ clubSlug: "otro" }))).rejects.toThrow(ClubNotFoundError);
    expect(saved).toHaveLength(0);
  });

  it("HU-04: comunidad de otro club falla y no guarda", async () => {
    const { createEvent, saved } = setup();
    await expect(createEvent(input({ communityId: "ajena" }))).rejects.toThrow(
      CommunityNotInClubError,
    );
    expect(saved).toHaveLength(0);
  });

  it("HU-04: fecha pasada falla y no guarda", async () => {
    const { createEvent, saved } = setup();
    await expect(createEvent(input({ startsAt: new Date("2026-01-01") }))).rejects.toThrow(
      EventInPastError,
    );
    expect(saved).toHaveLength(0);
  });

  it("guarda el lugar en la lista del club", async () => {
    const { createEvent, venues } = setup();
    await createEvent(input());
    expect((await venues.listInClub(club.id)).map((venue) => venue.name)).toEqual([
      input().venueName,
    ]);
  });
});
