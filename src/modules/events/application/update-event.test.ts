import { describe, expect, it } from "vitest";
import {
  CapacityBelowConfirmedError,
  ClubNotFoundError,
  CommunityNotInClubError,
  EventInPastError,
  EventNotEditableError,
  EventNotFoundError,
} from "../domain/errors";
import type { EventDetails } from "./ports";
import {
  CLUB,
  FAKE_TX,
  eventDetails,
  fakeEventRepository,
  fakeTransactions,
  fakeVenueBook,
} from "./fakes";
import { makeUpdateEvent, type UpdateEventInput } from "./update-event";

const NOW = new Date("2026-12-01T12:00:00.000Z");

function setup(stored: EventDetails | null, confirmed: number, waiting = 0) {
  const updates: unknown[] = [];
  const updateEvent = makeUpdateEvent({
    venues: fakeVenueBook(),
    clubs: { findBySlug: async (slug) => (slug === CLUB.slug ? CLUB : null) },
    events: fakeEventRepository({
      lockInClub: async (clubId, id, tx) =>
        tx === FAKE_TX && stored && stored.clubId === clubId && stored.id === id ? stored : null,
      update: async (id, changes, tx) => {
        expect(tx).toBe(FAKE_TX);
        updates.push({ id, ...changes });
      },
    }),
    registrations: {
      countConfirmed: async () => confirmed,
      listIds: async () => [],
      promoteWaitlisted: async (_eventId, seats) => Math.min(seats, waiting),
    },
    transactions: fakeTransactions,
    now: () => NOW,
  });
  return { updates, updateEvent };
}

const input = (overrides: Partial<UpdateEventInput> = {}): UpdateEventInput => ({
  clubSlug: CLUB.slug,
  eventId: "evt-1",
  communityId: "com-1",
  title: "Mixto",
  startsAt: new Date("2026-12-05T00:00:00Z"),
  venueName: "Coliseo",
  mapsUrl: null,
  priceCents: 1500,
  capacity: 18,
  category: "men" as const,
  rules: null,
  publish: false,
  ...overrides,
});

describe("HU-05 criterio 1: updateEvent no baja cupos de los confirmados", () => {
  it("HU-05: cupos menores a los confirmados falla y no actualiza", async () => {
    const { updateEvent, updates } = setup(eventDetails(), 10);
    await expect(updateEvent(input({ capacity: 9 }))).rejects.toThrow(CapacityBelowConfirmedError);
    expect(updates).toHaveLength(0);
  });

  it("HU-05: cupos iguales a los confirmados deja la convocatoria llena", async () => {
    const { updateEvent, updates } = setup(eventDetails({ status: "published" }), 10);
    expect(await updateEvent(input({ capacity: 10 }))).toEqual({ status: "full" });
    expect(updates).toEqual([expect.objectContaining({ capacity: 10, status: "full" })]);
  });

  it("HU-05: subir cupos en una convocatoria llena la vuelve a publicada", async () => {
    const { updateEvent } = setup(eventDetails({ status: "full", capacity: 10 }), 10);
    expect(await updateEvent(input({ capacity: 12 }))).toEqual({ status: "published" });
  });

  it("HU-05: un borrador con publish pasa a publicada", async () => {
    const { updateEvent, updates } = setup(eventDetails({ status: "draft" }), 0);
    expect(await updateEvent(input({ publish: true }))).toEqual({ status: "published" });
    expect(updates[0]).toMatchObject({ status: "published" });
  });

  it("HU-05: un borrador sin publish sigue en borrador", async () => {
    const { updateEvent } = setup(eventDetails({ status: "draft" }), 0);
    expect(await updateEvent(input())).toEqual({ status: "draft" });
  });

  it("HU-05: publish no tiene efecto sobre una convocatoria ya publicada", async () => {
    const { updateEvent } = setup(eventDetails({ status: "published" }), 0);
    expect(await updateEvent(input({ publish: true }))).toEqual({ status: "published" });
  });
});

describe("HU-05: updateEvent casos borde", () => {
  it("HU-05: una convocatoria cerrada no se edita", async () => {
    const { updateEvent, updates } = setup(eventDetails({ status: "closed" }), 0);
    await expect(updateEvent(input())).rejects.toThrow(EventNotEditableError);
    expect(updates).toHaveLength(0);
  });

  it("HU-05: una convocatoria cancelada no se edita", async () => {
    const { updateEvent } = setup(eventDetails({ status: "cancelled" }), 0);
    await expect(updateEvent(input())).rejects.toThrow(EventNotEditableError);
  });

  it("HU-05: fecha pasada falla y no actualiza", async () => {
    const { updateEvent, updates } = setup(eventDetails(), 0);
    await expect(updateEvent(input({ startsAt: new Date("2026-01-01") }))).rejects.toThrow(
      EventInPastError,
    );
    expect(updates).toHaveLength(0);
  });

  it("HU-05: evento inexistente falla con EventNotFoundError", async () => {
    const { updateEvent } = setup(null, 0);
    await expect(updateEvent(input())).rejects.toThrow(EventNotFoundError);
  });

  it("HU-05: evento de otro club falla con EventNotFoundError", async () => {
    const { updateEvent } = setup(eventDetails({ clubId: "otro-club" }), 0);
    await expect(updateEvent(input())).rejects.toThrow(EventNotFoundError);
  });

  it("HU-05: comunidad de otro club falla y no actualiza", async () => {
    const { updateEvent, updates } = setup(eventDetails(), 0);
    await expect(updateEvent(input({ communityId: "ajena" }))).rejects.toThrow(
      CommunityNotInClubError,
    );
    expect(updates).toHaveLength(0);
  });

  it("HU-05: club inexistente falla", async () => {
    const { updateEvent } = setup(eventDetails(), 0);
    await expect(updateEvent(input({ clubSlug: "no" }))).rejects.toThrow(ClubNotFoundError);
  });
});

describe("HU-12 criterio 2: los cupos nuevos pasan primero a la lista de espera", () => {
  it("HU-12: subir la capacidad de una convocatoria llena promueve a los que esperan", async () => {
    const { updateEvent } = setup(eventDetails({ status: "full", capacity: 10 }), 10, 3);
    expect(await updateEvent(input({ capacity: 12 }))).toEqual({ status: "full" });
  });

  it("HU-12: si esperan menos que los cupos nuevos, se reabre", async () => {
    const { updateEvent } = setup(eventDetails({ status: "full", capacity: 10 }), 10, 1);
    expect(await updateEvent(input({ capacity: 12 }))).toEqual({ status: "published" });
  });
});
