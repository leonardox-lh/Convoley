import { describe, expect, it } from "vitest";
import { SEAT_HOLDING_STATUSES } from "./registration";

describe("HU-05 criterio 1: confirmados", () => {
  it("HU-05: los estados que ocupan cupo son pending_payment, in_review y paid", () => {
    expect([...SEAT_HOLDING_STATUSES]).toEqual(["pending_payment", "in_review", "paid"]);
  });

  it("HU-05: una inscripcion cancelada no ocupa cupo", () => {
    expect(SEAT_HOLDING_STATUSES).not.toContain("cancelled");
  });
});
