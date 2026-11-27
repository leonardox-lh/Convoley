import { describe, expect, it } from "vitest";
import type { EventTeam } from "@/modules/registrations";
import { teamsImageLayout } from "./teams-image";

const team = (number: number, names: [string, string][]) =>
  ({
    number,
    name: `Equipo ${number}`,
    players: names.map(([firstName, lastName], index) => ({
      id: `${number}-${index}`,
      firstName,
      lastName,
    })),
  }) as unknown as EventTeam;

describe("teamsImageLayout", () => {
  it("shrinks the font so long full names fit on one line", () => {
    const short = teamsImageLayout("cuadrado", [
      team(1, [["Ana", "Paz"]]),
      team(2, [["Luis", "Ruiz"]]),
      team(3, [["Eva", "Sol"]]),
    ]);
    const long = teamsImageLayout("cuadrado", [
      team(1, [["María Fernanda", "Quispe Huamán"]]),
      team(2, [["Luis", "Ruiz"]]),
      team(3, [["Eva", "Sol"]]),
    ]);
    expect(long.fontPx).toBeLessThan(short.fontPx);
  });

  it("never goes below the minimum font; longer names end in an ellipsis", () => {
    const layout = teamsImageLayout("cuadrado", [
      team(1, [["Nombre muy muy muy largo", "Apellido larguísimo de verdad"]]),
      team(2, [["Luis", "Ruiz"]]),
      team(3, [["Eva", "Sol"]]),
    ]);
    expect(layout.fontPx).toBe(18);
  });
});
