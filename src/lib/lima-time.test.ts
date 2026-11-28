import { describe, expect, it } from "vitest";
import {
  defaultEventDateInLima,
  limaDateAndTime,
  limaDateTimeToUtc,
  todayInLima,
} from "./lima-time";

describe("Fecha por defecto de una convocatoria nueva", () => {
  it("antes de las 9 p. m. en Lima es hoy", () => {
    // 20:59 en Lima
    expect(defaultEventDateInLima(new Date("2026-12-06T01:59:00Z"))).toBe("2026-12-05");
  });

  it("desde las 9 p. m. en Lima es mañana", () => {
    // 21:00 en Lima
    expect(defaultEventDateInLima(new Date("2026-12-06T02:00:00Z"))).toBe("2026-12-06");
  });

  it("en la mañana es hoy", () => {
    // 08:00 en Lima
    expect(defaultEventDateInLima(new Date("2026-12-05T13:00:00Z"))).toBe("2026-12-05");
  });
});

describe("HU-04: hora de Lima", () => {
  it("HU-04: 2026-12-05 19:00 en Lima es 2026-12-06T00:00Z", () => {
    expect(limaDateTimeToUtc("2026-12-05", "19:00").toISOString()).toBe("2026-12-06T00:00:00.000Z");
  });

  it("HU-04: todayInLima usa el dia de Lima, no el de UTC", () => {
    expect(todayInLima(new Date("2026-12-06T02:00:00Z"))).toBe("2026-12-05");
  });
});

describe("HU-05: limaDateAndTime", () => {
  it("HU-05: 2026-12-06T00:00Z es 2026-12-05 19:00 en Lima", () => {
    expect(limaDateAndTime(new Date("2026-12-06T00:00:00Z"))).toEqual({
      date: "2026-12-05",
      time: "19:00",
    });
  });
});
