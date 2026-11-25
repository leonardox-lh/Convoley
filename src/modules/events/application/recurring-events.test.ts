import { describe, expect, it } from "vitest";
import { CommunityNotInClubError, RecurringEventNotFoundError } from "../domain/errors";
import { CLUB } from "./fakes";
import type { RecurringEvent, RecurringEventRepository } from "./ports";
import {
  makeCreateRecurringEvent,
  makeListRecurringEvents,
  makeSetRecurringEventPaused,
} from "./recurring-events";

const MONDAY_MORNING = new Date("2026-11-30T14:00:00Z");
const NEXT_TUESDAY_8PM = new Date("2026-12-02T01:00:00Z");

/** In-memory templates; published slots are unique per template, like the database index. */
function fakeRecurring() {
  const templates: RecurringEvent[] = [];
  const published = new Map<string, Date[]>();
  const repository: RecurringEventRepository = {
    async create(template) {
      const id = `rec-${templates.length + 1}`;
      templates.push({ ...template, id, isPaused: false });
      return { id };
    },
    listInClub: async (clubId) =>
      templates
        .filter((template) => template.clubId === clubId)
        .map((template) => ({ ...template, communityName: "General" })),
    async setPaused(clubId, id, isPaused) {
      const template = templates.find((row) => row.id === id && row.clubId === clubId);
      if (!template) return false;
      template.isPaused = isPaused;
      return true;
    },
    async publishOccurrences(template, slots) {
      const existing = published.get(template.id) ?? [];
      const fresh = slots.filter((slot) => !existing.some((e) => e.getTime() === slot.getTime()));
      published.set(template.id, [...existing, ...fresh]);
    },
  };
  return { repository, templates, published };
}

function setup() {
  const fake = fakeRecurring();
  let now = MONDAY_MORNING;
  const deps = {
    clubs: { findBySlug: async (slug: string) => (slug === CLUB.slug ? CLUB : null) },
    recurring: fake.repository,
    now: () => now,
  };
  return {
    ...fake,
    setNow: (date: Date) => (now = date),
    create: makeCreateRecurringEvent(deps),
    list: makeListRecurringEvents(deps),
    setPaused: makeSetRecurringEventPaused(deps),
  };
}

const input = {
  clubSlug: CLUB.slug,
  communityId: "com-1",
  title: "Mixto martes",
  venueName: "Coliseo",
  mapsUrl: null,
  priceCents: 1500,
  capacity: 18,
  isMixed: true,
  rules: null,
  weekday: 2,
  startMinute: 20 * 60,
  publishDaysBefore: 6,
};

describe("HU-28: convocatorias recurrentes", () => {
  it("HU-28 criterio 1: crea la plantilla semanal y publica la fecha que ya toca", async () => {
    const club = setup();
    const { id } = await club.create(input);
    expect(await club.list(CLUB.slug)).toHaveLength(1);
    expect(club.published.get(id)).toEqual([NEXT_TUESDAY_8PM]);
  });

  it("HU-28 criterio 1: la comunidad debe ser del club", async () => {
    const club = setup();
    await expect(club.create({ ...input, communityId: "otra" })).rejects.toThrow(
      CommunityNotInClubError,
    );
  });

  it("HU-28 criterio 2: no publica antes de la ventana", async () => {
    const club = setup();
    const { id } = await club.create({ ...input, publishDaysBefore: 0 });
    expect(club.published.get(id)).toBeUndefined();
  });

  it("HU-28 criterio 3: pausar y reanudar; al reanudar publica lo que toca", async () => {
    const club = setup();
    const { id } = await club.create({ ...input, publishDaysBefore: 0 });
    await club.setPaused({ clubSlug: CLUB.slug, recurringEventId: id, isPaused: true });
    expect(club.templates[0].isPaused).toBe(true);
    club.setNow(new Date(NEXT_TUESDAY_8PM.getTime() - 60 * 60 * 1000));
    await club.setPaused({ clubSlug: CLUB.slug, recurringEventId: id, isPaused: false });
    expect(club.published.get(id)).toEqual([NEXT_TUESDAY_8PM]);
  });

  it("HU-28 criterio 3: no pausa una recurrente de otro club", async () => {
    const club = setup();
    await expect(
      club.setPaused({ clubSlug: CLUB.slug, recurringEventId: "ajena", isPaused: true }),
    ).rejects.toThrow(RecurringEventNotFoundError);
  });
});
