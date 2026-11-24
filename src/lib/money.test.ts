import { describe, expect, it } from "vitest";
import { formatSoles, solesToCents } from "./money";

describe("HU-04: solesToCents", () => {
  it.each([
    ["12.50", 1250],
    ["15", 1500],
    ["15,5", 1550],
    ["0", 0],
    [" 7.05 ", 705],
  ])("HU-04: %s -> %s centimos", (raw, cents) => {
    expect(solesToCents(raw)).toBe(cents);
  });

  it.each(["15.555", "-1", "abc", "", "1.", "100000"])("HU-04: %j es invalido", (raw) => {
    expect(solesToCents(raw)).toBeNull();
  });

  it("HU-04: formatSoles muestra soles", () => {
    expect(formatSoles(1250)).toMatch(/12[.,]50/);
  });
});
