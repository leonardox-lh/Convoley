import { describe, expect, it } from "vitest";
import { defaultLevelRows } from "./community";

describe("niveles por defecto de un club nuevo", () => {
  it("crea General, Básico, Intermedio y Competitivo en ese orden", () => {
    const rows = defaultLevelRows(new Date("2026-11-25T12:00:00Z"));
    expect(rows.map((row) => row.name)).toEqual(["General", "Básico", "Intermedio", "Competitivo"]);
    const times = rows.map((row) => row.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(rows.length);
  });
});
