import { describe, expect, it } from "vitest";
import {
  canEditPlayerDetails,
  PLAYER_LEVELS,
  PLAYER_POSITIONS,
  SEAT_HOLDING_STATUSES,
  seatSummary,
} from "./registration";

describe("HU-05 criterio 1: confirmados", () => {
  it("HU-05: los estados que ocupan cupo son pending_payment, in_review y paid", () => {
    expect([...SEAT_HOLDING_STATUSES]).toEqual(["pending_payment", "in_review", "paid"]);
  });

  it("HU-05: una inscripcion cancelada no ocupa cupo", () => {
    expect(SEAT_HOLDING_STATUSES).not.toContain("cancelled");
  });
});

describe("HU-07 criterio 3: contador de cupos", () => {
  it("HU-07 criterio 3: ocupados y libres suman la capacidad", () => {
    expect(seatSummary(10, 2)).toEqual({ taken: 2, free: 8 });
  });

  it("HU-07 criterio 3: sin inscritos todos los cupos están libres", () => {
    expect(seatSummary(10, 0)).toEqual({ taken: 0, free: 10 });
  });

  it("HU-07 criterio 3: con cupos llenos quedan 0 libres", () => {
    expect(seatSummary(10, 10)).toEqual({ taken: 10, free: 0 });
  });

  it("HU-07 criterio 3: libres nunca es negativo", () => {
    expect(seatSummary(10, 12).free).toBe(0);
  });
});

describe("HU-10: posiciones y niveles", () => {
  it("HU-10 criterio 1: armador, líbero, punta, central, opuesto y cualquiera", () => {
    expect([...PLAYER_POSITIONS]).toEqual([
      "setter",
      "libero",
      "outside_hitter",
      "middle_blocker",
      "opposite",
      "any",
    ]);
  });

  it("HU-10 criterio 2: principiante, intermedio y avanzado", () => {
    expect([...PLAYER_LEVELS]).toEqual(["beginner", "intermediate", "advanced"]);
  });
});

describe("canEditPlayerDetails", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const event = { status: "published", startsAt: new Date("2026-11-25T00:00:00Z") };
  const editable = (overrides: Partial<Parameters<typeof canEditPlayerDetails>[0]> = {}) =>
    canEditPlayerDetails({ status: "paid", event, teamsBuilt: false, now, ...overrides });

  it("allows it before the teams are built and the event starts", () => {
    expect(editable()).toBe(true);
    expect(editable({ status: "waitlisted" })).toBe(true);
  });

  it("locks it once teams exist, the event started or the sign-up was cancelled", () => {
    expect(editable({ teamsBuilt: true })).toBe(false);
    expect(editable({ event: { ...event, startsAt: now } })).toBe(false);
    expect(editable({ event: { ...event, status: "cancelled" } })).toBe(false);
    expect(editable({ status: "cancelled" })).toBe(false);
  });
});
