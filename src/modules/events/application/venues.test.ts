import { describe, expect, it } from "vitest";
import { CLUB, fakeVenueBook } from "./fakes";
import { makeListClubVenues, makeRemoveClubVenue } from "./venues";

const clubs = { findBySlug: async (slug: string) => (slug === CLUB.slug ? CLUB : null) };

function setup() {
  const venues = fakeVenueBook();
  return {
    venues,
    list: makeListClubVenues({ clubs, venues }),
    remove: makeRemoveClubVenue({ clubs, venues }),
  };
}

describe("Lugares guardados del club", () => {
  it("lista primero el último lugar usado, sin repetir", async () => {
    const { venues, list } = setup();
    await venues.remember(CLUB.id, { name: "Coliseo A", mapsUrl: null });
    await venues.remember(CLUB.id, { name: "Coliseo B", mapsUrl: null });
    await venues.remember(CLUB.id, { name: "Coliseo A", mapsUrl: "https://maps.app.goo.gl/a" });
    expect(await list(CLUB.slug)).toEqual([
      { id: expect.any(String), name: "Coliseo A", mapsUrl: "https://maps.app.goo.gl/a" },
      { id: expect.any(String), name: "Coliseo B", mapsUrl: null },
    ]);
  });

  it("guardar sin link no borra el link que ya tenía", async () => {
    const { venues, list } = setup();
    await venues.remember(CLUB.id, { name: "Coliseo A", mapsUrl: "https://maps.app.goo.gl/a" });
    await venues.remember(CLUB.id, { name: "Coliseo A", mapsUrl: null });
    expect((await list(CLUB.slug))[0].mapsUrl).toBe("https://maps.app.goo.gl/a");
  });

  it("eliminar lo saca de la lista del club", async () => {
    const { venues, list, remove } = setup();
    await venues.remember(CLUB.id, { name: "Coliseo A", mapsUrl: null });
    const [venue] = await list(CLUB.slug);
    await remove({ clubSlug: CLUB.slug, venueId: venue.id });
    expect(await list(CLUB.slug)).toEqual([]);
  });

  it("no elimina lugares de otro club", async () => {
    const { venues, list, remove } = setup();
    await venues.remember("otro-club", { name: "Coliseo X", mapsUrl: null });
    await venues.remember(CLUB.id, { name: "Coliseo A", mapsUrl: null });
    const [own] = await list(CLUB.slug);
    await remove({ clubSlug: CLUB.slug, venueId: "venue-1" });
    expect(await list(CLUB.slug)).toEqual([own]);
    expect(await venues.listInClub("otro-club")).toHaveLength(1);
  });
});
