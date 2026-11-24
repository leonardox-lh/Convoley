import { describe, expect, it } from "vitest";
import {
  CapacityBelowConfirmedError,
  EventAlreadyCancelledError,
  EventInPastError,
  EventNotEditableError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidPriceError,
} from "./errors";
import {
  EVENT_STATUSES,
  assertCancellable,
  assertCapacityCoversConfirmed,
  assertEditable,
  eventSharePath,
  newEvent,
  remainingSpots,
  statusAfterCapacityChange,
  type EventStatus,
  type NewEventProps,
} from "./event";

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

describe("HU-05 criterio 1: cupos no bajan de los confirmados", () => {
  it("HU-05: cupos menores a los confirmados fallan con CapacityBelowConfirmedError", () => {
    expect(() => assertCapacityCoversConfirmed(9, 10)).toThrow(CapacityBelowConfirmedError);
  });

  it("HU-05: cupos iguales a los confirmados pasan", () => {
    expect(() => assertCapacityCoversConfirmed(10, 10)).not.toThrow();
  });

  it("HU-05: cupos mayores a los confirmados pasan", () => {
    expect(() => assertCapacityCoversConfirmed(11, 10)).not.toThrow();
  });

  it("HU-05: el error lleva cupos y confirmados", () => {
    expect(() => assertCapacityCoversConfirmed(3, 5)).toThrow(
      expect.objectContaining({ capacity: 3, confirmed: 5 }),
    );
  });
});

describe("HU-05: estado segun cupos", () => {
  it("HU-05: published pasa a full cuando confirmados >= cupos", () => {
    expect(statusAfterCapacityChange("published", 10, 10)).toBe("full");
  });

  it("HU-05: published sigue published si quedan cupos", () => {
    expect(statusAfterCapacityChange("published", 10, 9)).toBe("published");
  });

  it("HU-05: full vuelve a published al subir los cupos", () => {
    expect(statusAfterCapacityChange("full", 12, 10)).toBe("published");
  });

  it("HU-05: full sigue full si no hay cupos nuevos", () => {
    expect(statusAfterCapacityChange("full", 10, 10)).toBe("full");
  });

  it("HU-05: draft se queda draft aunque los cupos esten cubiertos", () => {
    expect(statusAfterCapacityChange("draft", 10, 10)).toBe("draft");
  });
});

describe("HU-05: que se puede editar y cancelar", () => {
  it.each<EventStatus>(["draft", "published", "full"])("HU-05: %s es editable", (status) => {
    expect(() => assertEditable(status)).not.toThrow();
  });

  it.each<EventStatus>(["closed", "cancelled"])(
    "HU-05: %s no es editable (EventNotEditableError)",
    (status) => {
      expect(() => assertEditable(status)).toThrow(EventNotEditableError);
    },
  );

  it("HU-05: una convocatoria ya cancelada no se cancela otra vez", () => {
    expect(() => assertCancellable("cancelled")).toThrow(EventAlreadyCancelledError);
  });

  it.each<EventStatus>(["draft", "published", "full", "closed"])(
    "HU-05: %s se puede cancelar",
    (status) => {
      expect(() => assertCancellable(status)).not.toThrow();
    },
  );
});

describe("HU-03: remainingSpots", () => {
  it("HU-03: resta los confirmados de la capacidad", () => {
    expect(remainingSpots(18, 5)).toBe(13);
    expect(remainingSpots(18, 0)).toBe(18);
  });

  it("HU-03: con todos los cupos tomados quedan 0", () => {
    expect(remainingSpots(18, 18)).toBe(0);
  });

  it("HU-03: nunca es negativo si hay más confirmados que la capacidad", () => {
    expect(remainingSpots(10, 14)).toBe(0);
  });
});
