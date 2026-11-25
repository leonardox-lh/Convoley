import { describe, expect, it, vi } from "vitest";
import { LISTED_STATUSES } from "../domain/event";
import { CLUB, eventDetails, fakeEventRepository } from "./fakes";
import { makeListOpenEvents } from "./list-open-events";

const NOW = new Date("2026-12-01T12:00:00.000Z");

function build(
  options: { events?: ReturnType<typeof eventDetails>[]; counts?: Record<string, number> } = {},
) {
  const listInClub = vi.fn(async () => options.events ?? []);
  const countConfirmedByEvent = vi.fn(async () => new Map(Object.entries(options.counts ?? {})));
  const listOpenEvents = makeListOpenEvents({
    clubs: { findBySlug: async (slug) => (slug === CLUB.slug ? CLUB : null) },
    events: fakeEventRepository({ listInClub }),
    registrations: { countConfirmedByEvent },
    publishDueOccurrences: async () => undefined,
    now: () => NOW,
  });
  return { listOpenEvents, listInClub, countConfirmedByEvent };
}

describe("HU-03: listar convocatorias abiertas del club", () => {
  it("HU-03: un club que no existe devuelve null", async () => {
    const { listOpenEvents, listInClub } = build();
    expect(await listOpenEvents("no-existe")).toBeNull();
    expect(listInClub).not.toHaveBeenCalled();
  });

  it("HU-03: pide al repositorio solo published y full desde ahora", async () => {
    const { listOpenEvents, listInClub } = build();
    await listOpenEvents(CLUB.slug);
    expect(listInClub).toHaveBeenCalledWith(CLUB.id, { statuses: LISTED_STATUSES, from: NOW });
    expect(LISTED_STATUSES).toEqual(["published", "full"]);
  });

  it("HU-03: calcula los cupos restantes de cada convocatoria", async () => {
    const { listOpenEvents } = build({
      events: [
        eventDetails({ id: "a", capacity: 18 }),
        eventDetails({ id: "b", capacity: 10, status: "full" }),
      ],
      counts: { a: 5, b: 10 },
    });
    const result = await listOpenEvents(CLUB.slug);
    expect(result?.map((e) => [e.id, e.remainingSpots])).toEqual([
      ["a", 13],
      ["b", 0],
    ]);
  });

  it("HU-03: expone fecha, lugar y precio de cada convocatoria", async () => {
    const { listOpenEvents } = build({ events: [eventDetails()] });
    const [event] = (await listOpenEvents(CLUB.slug))!;
    expect(event).toMatchObject({
      startsAt: new Date("2026-12-05T00:00:00Z"),
      venueName: "Coliseo",
      priceCents: 1500,
    });
  });

  it("HU-03: sin inscripciones confirmadas quedan todos los cupos", async () => {
    const { listOpenEvents } = build({ events: [eventDetails({ capacity: 18 })] });
    expect((await listOpenEvents(CLUB.slug))![0]!.remainingSpots).toBe(18);
  });

  it("HU-03: cuenta los confirmados de todas las convocatorias en una sola llamada", async () => {
    const { listOpenEvents, countConfirmedByEvent } = build({
      events: [eventDetails({ id: "a" }), eventDetails({ id: "b" }), eventDetails({ id: "c" })],
    });
    await listOpenEvents(CLUB.slug);
    expect(countConfirmedByEvent).toHaveBeenCalledTimes(1);
    expect(countConfirmedByEvent).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  it("HU-03: sin convocatorias devuelve lista vacía y no cuenta inscripciones", async () => {
    const { listOpenEvents, countConfirmedByEvent } = build();
    expect(await listOpenEvents(CLUB.slug)).toEqual([]);
    expect(countConfirmedByEvent).not.toHaveBeenCalled();
  });
});
