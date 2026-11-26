import { describe, expect, it } from "vitest";
import { isNameTaken } from "./player-name";

describe("isNameTaken", () => {
  const active = [
    { firstName: "José", lastName: "Pérez" },
    { firstName: "Carlos", lastName: "" },
  ];

  it("same name ignoring case, accents and extra spaces", () => {
    expect(isNameTaken({ firstName: "jose ", lastName: " PEREZ" }, active)).toBe(true);
    expect(isNameTaken({ firstName: "Carlos", lastName: "" }, active)).toBe(true);
  });

  it("a different last name is another player", () => {
    expect(isNameTaken({ firstName: "Carlos", lastName: "Ruiz" }, active)).toBe(false);
    expect(isNameTaken({ firstName: "José", lastName: "Paz" }, active)).toBe(false);
  });
});
