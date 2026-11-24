import { describe, expect, it } from "vitest";
import { CLUB, eventDetails, fakeEventRepository } from "./fakes";
import { makeGetOrganizerEvent } from "./get-organizer-event";
import type { EventDetails } from "./ports";

function setup(stored: EventDetails | null) {
  return makeGetOrganizerEvent({
    clubs: { findBySlug: async (slug) => (slug === CLUB.slug ? CLUB : null) },
    events: fakeEventRepository({
      findInClub: async (clubId, id) =>
        stored && stored.clubId === clubId && stored.id === id ? stored : null,
    }),
    registrations: { countConfirmed: async () => 7, listIds: async () => [] },
  });
}

describe("HU-05: getOrganizerEvent", () => {
  it("HU-05: devuelve un borrador con confirmedCount y sharePath", async () => {
    const result = await setup(eventDetails({ status: "draft" }))({
      clubSlug: CLUB.slug,
      eventId: "evt-1",
    });
    expect(result).toMatchObject({
      status: "draft",
      confirmedCount: 7,
      sharePath: "/c/voley/evt-1",
    });
  });

  it("HU-05: club inexistente devuelve null", async () => {
    expect(await setup(eventDetails())({ clubSlug: "no", eventId: "evt-1" })).toBeNull();
  });

  it("HU-05: evento inexistente devuelve null", async () => {
    expect(await setup(null)({ clubSlug: CLUB.slug, eventId: "evt-1" })).toBeNull();
  });
});
