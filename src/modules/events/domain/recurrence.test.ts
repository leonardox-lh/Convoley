import { describe, expect, it } from "vitest";
import { EventEndsBeforeStartError, InvalidMapsUrlError, InvalidRecurrenceError } from "./errors";
import {
  dueOccurrences,
  nextOccurrence,
  occurrenceEndsAt,
  type RecurrenceProps,
  validateRecurrence,
} from "./recurrence";

const TUESDAY = 2;
const EIGHT_PM = 20 * 60;
// Monday 30 Nov 2026, 09:00 in Lima.
const MONDAY_MORNING = new Date("2026-11-30T14:00:00Z");
// Tuesday 1 Dec 2026, 20:00 in Lima = Wednesday 01:00 UTC.
const NEXT_TUESDAY_8PM = new Date("2026-12-02T01:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const props = (overrides: Partial<RecurrenceProps> = {}): RecurrenceProps => ({
  communityId: "com-1",
  title: "Mixto martes",
  venueName: "Coliseo",
  mapsUrl: null,
  priceCents: 1500,
  capacity: 18,
  category: "mixed" as const,
  rules: null,
  weekday: TUESDAY,
  startMinute: EIGHT_PM,
  publishDaysBefore: 6,
  ...overrides,
});

describe("HU-28 criterio 1: frecuencia semanal", () => {
  it("HU-28: la próxima fecha es el martes 8 p. m. en hora de Lima", () => {
    expect(nextOccurrence(props(), MONDAY_MORNING)).toEqual(NEXT_TUESDAY_8PM);
  });

  it("HU-28: si ya pasó la hora de este martes, es el de la semana siguiente", () => {
    const tuesdayAt9pm = new Date(NEXT_TUESDAY_8PM.getTime() + 60 * 60 * 1000);
    expect(nextOccurrence(props(), tuesdayAt9pm)).toEqual(
      new Date(NEXT_TUESDAY_8PM.getTime() + 7 * DAY_MS),
    );
  });

  it("HU-28: usa el día de Lima aunque en UTC ya sea el día siguiente", () => {
    // Monday 23:30 in Lima is Tuesday 04:30 UTC: the next Tuesday 8 p. m. is still tomorrow.
    const mondayNightLima = new Date("2026-12-01T04:30:00Z");
    expect(nextOccurrence(props(), mondayNightLima)).toEqual(NEXT_TUESDAY_8PM);
  });

  it("HU-28: rechaza día, hora o anticipación fuera de rango", () => {
    for (const overrides of [
      { weekday: 7 },
      { startMinute: 1440 },
      { publishDaysBefore: 14 },
      { publishDaysBefore: -1 },
    ]) {
      expect(() => validateRecurrence(props(overrides), MONDAY_MORNING)).toThrow(
        InvalidRecurrenceError,
      );
    }
  });

  it("HU-28: aplica las mismas reglas que una convocatoria (link de Maps)", () => {
    expect(() =>
      validateRecurrence(props({ mapsUrl: "https://evil.com" }), MONDAY_MORNING),
    ).toThrow(InvalidMapsUrlError);
  });
});

describe("hora de fin de la plantilla", () => {
  const TEN_PM = 22 * 60;

  it("cada fecha termina a la hora de fin de la plantilla", () => {
    expect(
      occurrenceEndsAt({ startMinute: EIGHT_PM, endMinute: TEN_PM }, NEXT_TUESDAY_8PM),
    ).toEqual(new Date("2026-12-02T03:00:00Z"));
  });

  it("sin hora de fin, la fecha tampoco tiene", () => {
    expect(
      occurrenceEndsAt({ startMinute: EIGHT_PM, endMinute: null }, NEXT_TUESDAY_8PM),
    ).toBeNull();
  });

  it("rechaza un fin que no es después del inicio", () => {
    expect(() => validateRecurrence(props({ endMinute: EIGHT_PM }), MONDAY_MORNING)).toThrow(
      EventEndsBeforeStartError,
    );
  });
});

describe("HU-28 criterio 2: se publican X días antes", () => {
  it("HU-28: con 6 días antes, el martes ya está publicado el lunes", () => {
    expect(dueOccurrences({ ...props(), isPaused: false }, MONDAY_MORNING)).toEqual([
      NEXT_TUESDAY_8PM,
    ]);
  });

  it("HU-28: con 0 días antes, solo se publica el mismo martes", () => {
    const template = { ...props({ publishDaysBefore: 0 }), isPaused: false };
    expect(dueOccurrences(template, MONDAY_MORNING)).toEqual([]);
    const tuesdayMorning = new Date(MONDAY_MORNING.getTime() + DAY_MS);
    expect(dueOccurrences(template, tuesdayMorning)).toEqual([NEXT_TUESDAY_8PM]);
  });

  it("HU-28: con 13 días antes publica las dos próximas fechas", () => {
    const template = { ...props({ publishDaysBefore: 13 }), isPaused: false };
    expect(dueOccurrences(template, MONDAY_MORNING)).toEqual([
      NEXT_TUESDAY_8PM,
      new Date(NEXT_TUESDAY_8PM.getTime() + 7 * DAY_MS),
    ]);
  });

  it("HU-28: no publica fechas pasadas", () => {
    const afterTheGame = new Date(NEXT_TUESDAY_8PM.getTime() + 1);
    const due = dueOccurrences({ ...props(), isPaused: false }, afterTheGame);
    expect(due.every((slot) => slot > afterTheGame)).toBe(true);
  });
});

describe("HU-28 criterio 3: se pueden pausar", () => {
  it("HU-28: una recurrente pausada no publica fechas", () => {
    expect(dueOccurrences({ ...props(), isPaused: true }, MONDAY_MORNING)).toEqual([]);
  });
});
