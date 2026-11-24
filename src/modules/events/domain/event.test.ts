import { describe, expect, it } from "vitest";
import {
  EventInPastError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidPriceError,
} from "./errors";
import { EVENT_STATUSES, eventSharePath, newEvent, type NewEventProps } from "./event";

const NOW = new Date("2026-12-01T12:00:00.000Z");
const FUTURE = new Date("2026-12-05T00:00:00.000Z");

const valid = (overrides: Partial<NewEventProps> = {}): NewEventProps => ({
  clubId: "club-1",
  communityId: "community-1",
  title: "Mixto intermedio",
  startsAt: FUTURE,
  venueName: "Coliseo",
  mapsUrl: null,
  priceCents: 1500,
  capacity: 18,
  isMixed: true,
  rules: null,
  status: "published",
  ...overrides,
});

describe("HU-04 criterio 1: estados", () => {
  it("HU-04: existen los 5 estados borrador, publicada, llena, cerrada y cancelada", () => {
    expect([...EVENT_STATUSES]).toEqual(["draft", "published", "full", "closed", "cancelled"]);
  });

  it("HU-04: crea la convocatoria en borrador", () => {
    expect(newEvent(valid({ status: "draft" }), NOW).status).toBe("draft");
  });

  it("HU-04: crea la convocatoria publicada", () => {
    expect(newEvent(valid({ status: "published" }), NOW).status).toBe("published");
  });
});

describe("HU-04 criterio 2: fecha futura y cupos > 0", () => {
  it("HU-04: rechaza una fecha pasada", () => {
    expect(() => newEvent(valid({ startsAt: new Date("2026-11-30T00:00:00Z") }), NOW)).toThrow(
      EventInPastError,
    );
  });

  it("HU-04: rechaza una fecha igual a ahora", () => {
    expect(() => newEvent(valid({ startsAt: NOW }), NOW)).toThrow(EventInPastError);
  });

  it("HU-04: acepta una fecha futura", () => {
    expect(newEvent(valid(), NOW).startsAt).toEqual(FUTURE);
  });

  it.each([0, -1, 1.5])("HU-04: rechaza cupos %s", (capacity) => {
    expect(() => newEvent(valid({ capacity }), NOW)).toThrow(InvalidCapacityError);
  });

  it("HU-04: acepta 1 cupo", () => {
    expect(newEvent(valid({ capacity: 1 }), NOW).capacity).toBe(1);
  });

  it.each([-1, 12.5])("HU-04: rechaza precio %s", (priceCents) => {
    expect(() => newEvent(valid({ priceCents }), NOW)).toThrow(InvalidPriceError);
  });

  it("HU-04: acepta precio 0 (convocatoria gratis)", () => {
    expect(newEvent(valid({ priceCents: 0 }), NOW).priceCents).toBe(0);
  });
});

describe("HU-04: link de Google Maps", () => {
  it.each([
    "https://maps.app.goo.gl/abc123",
    "https://maps.google.com/?q=coliseo",
    "https://www.google.com/maps/place/Coliseo",
  ])("HU-04: acepta %s", (mapsUrl) => {
    expect(newEvent(valid({ mapsUrl }), NOW).mapsUrl).toBe(mapsUrl);
  });

  it.each([
    "http://maps.google.com/?q=x",
    "https://example.com/maps/x",
    "https://www.google.com/search?q=x",
    "no es un link",
  ])("HU-04: rechaza %s", (mapsUrl) => {
    expect(() => newEvent(valid({ mapsUrl }), NOW)).toThrow(InvalidMapsUrlError);
  });
});

describe("HU-04 criterio 3: link para compartir", () => {
  it("HU-04: eventSharePath arma /c/<club>/<id>", () => {
    expect(eventSharePath("voley-miraflores", "evt1")).toBe("/c/voley-miraflores/evt1");
  });
});
