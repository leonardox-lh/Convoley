import { describe, expect, it } from "vitest";
import { suggestedEndTime } from "./event-time";

describe("Hora de fin por defecto: inicio redondeado + 2 horas", () => {
  it.each([
    ["19:00", "21:00"],
    ["18:50", "21:00"],
    ["18:30", "21:00"],
    ["19:20", "21:00"],
    ["07:00", "09:00"],
    ["21:20", "23:00"],
  ])("inicio %s → fin %s", (start, end) => {
    expect(suggestedEndTime(start)).toBe(end);
  });

  it("no sugiere una hora que pase la medianoche", () => {
    expect(suggestedEndTime("22:00")).toBeNull();
  });
});
