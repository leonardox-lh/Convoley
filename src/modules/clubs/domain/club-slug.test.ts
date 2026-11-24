import { describe, expect, test } from "vitest";
import { ClubSlug } from "./club-slug";
import { InvalidClubSlugError } from "./errors";

describe("HT-01: ClubSlug (módulo de ejemplo)", () => {
  test.each([
    ["Vóley Miraflores", "voley-miraflores"],
    ["  Club__Ñaña!! ", "club-nana"],
  ])("normaliza %j a %j", (raw, expected) => {
    expect(ClubSlug.create(raw).value).toBe(expected);
  });

  test.each([["ab"], ["a".repeat(41)], ["!!!"]])("rechaza %j", (raw) => {
    expect(() => ClubSlug.create(raw)).toThrow(InvalidClubSlugError);
  });
});
