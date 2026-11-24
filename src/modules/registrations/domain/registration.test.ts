import { describe, expect, it } from "vitest";
import { SEAT_HOLDING_STATUSES, seatSummary } from "./registration";

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
