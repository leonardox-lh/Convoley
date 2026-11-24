import { describe, expect, it } from "vitest";
import { eventDetails, fakeEventRepository } from "./fakes";
import { makeGetPublicEvent } from "./get-public-event";
import type { ClubReader, EventDetails } from "./ports";

const club = { id: "club-1", slug: "voley", name: "Voley", communities: [] };
const event = (status: EventDetails["status"]): EventDetails => eventDetails({ status });

function setup(stored: EventDetails | null) {
  const clubs: ClubReader = { findBySlug: async (slug) => (slug === "voley" ? club : null) };
  const events = fakeEventRepository({
    findInClub: async (clubId, id) =>
      stored && stored.clubId === clubId && stored.id === id ? stored : null,
  });
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

describe("HU-05 criterio 2: los inscritos ven el aviso de cancelacion", () => {
  it("HU-05: una convocatoria cancelada sigue visible con su estado y su resultado", async () => {
    const stored = eventDetails({ status: "cancelled", cancellationOutcome: "balance" });
    const result = await setup(stored)({ clubSlug: "voley", eventId: "evt-1" });
    expect(result).toMatchObject({ status: "cancelled", cancellationOutcome: "balance" });
  });

  it("HU-05: cancelada con devolucion expone refund", async () => {
    const stored = eventDetails({ status: "cancelled", cancellationOutcome: "refund" });
    const result = await setup(stored)({ clubSlug: "voley", eventId: "evt-1" });
    expect(result?.cancellationOutcome).toBe("refund");
  });
});
