import { describe, expect, it } from "vitest";
import type { EventTeam } from "@/modules/registrations";
import { teamsImageLayout } from "./teams-image";

const BRAND = { title: "Mixto intermedio", logo: null };

const team = (number: number, names: [string, string][]) =>
  ({
    number,
    name: `Equipo ${number}`,
    players: names.map(([firstName, lastName], index) => ({
      id: `${number}-${index}`,
      firstName,
      lastName,
      position: "setter",
    })),
  }) as unknown as EventTeam;

const three = (first: [string, string][]) => [
  team(1, first),
  team(2, [["Luis", "Ruiz"]]),
  team(3, [["Eva", "Sol"]]),
];

describe("teamsImageLayout", () => {
  it("shrinks the font so long full names fit on one line", () => {
    const short = teamsImageLayout(three([["Ana", "Paz"]]), BRAND);
    const long = teamsImageLayout(three([["María Fernanda", "Quispe Huamán"]]), BRAND);
    expect(long.namePx).toBeLessThan(short.namePx);
  });

  it("never goes below the minimum font; longer names end in an ellipsis", () => {
    const layout = teamsImageLayout(
      three([["Nombre muy muy muy largo", "Apellido larguísimo de verdad"]]),
      BRAND,
    );
    expect(layout.namePx).toBe(18);
  });

  it("is as tall as its content: more players make a taller image", () => {
    const small = teamsImageLayout(three([["Ana", "Paz"]]), BRAND);
    const big = teamsImageLayout(
      three([
        ["Ana", "Paz"],
        ["Rosa", "Vega"],
        ["Teo", "Lun"],
        ["Iván", "Mar"],
      ]),
      BRAND,
    );
    expect(big.height).toBeGreaterThan(small.height);
    expect(small.width).toBe(1080);
    expect(small.height).toBeLessThan(1080);
  });
});
