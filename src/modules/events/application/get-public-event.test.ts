import { describe, expect, it } from "vitest";
import { makeGetPublicEvent } from "./get-public-event";
import type { ClubReader, EventDetails, EventRepository } from "./ports";

const club = { id: "club-1", slug: "voley", name: "Voley", communities: [] };
const event = (status: EventDetails["status"]): EventDetails => ({
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
  status,
});

function setup(stored: EventDetails | null) {
  const clubs: ClubReader = { findBySlug: async (slug) => (slug === "voley" ? club : null) };
  const events: EventRepository = {
    create: async () => ({ id: "x" }),
    findInClub: async (clubId, id) =>
      stored && stored.clubId === clubId && stored.id === id ? stored : null,
  };
  return makeGetPublicEvent({ clubs, events });
}

describe("HU-04: getPublicEvent (link para compartir)", () => {
  it("HU-04: una convocatoria publicada se ve desde su link con el nombre del club", async () => {
    const result = await setup(event("published"))({ clubSlug: "voley", eventId: "evt-1" });
    expect(result).toMatchObject({ title: "Mixto", clubName: "Voley" });
  });

  it("HU-04: un borrador no es publico", async () => {
    expect(await setup(event("draft"))({ clubSlug: "voley", eventId: "evt-1" })).toBeNull();
  });

  it("HU-04: club inexistente devuelve null", async () => {
    expect(await setup(event("published"))({ clubSlug: "no", eventId: "evt-1" })).toBeNull();
  });

  it("HU-04: evento inexistente devuelve null", async () => {
    expect(await setup(null)({ clubSlug: "voley", eventId: "evt-1" })).toBeNull();
  });
});
