import { describe, expect, test } from "vitest";
import { ClubSlug } from "./club-slug";
import { InvalidClubSlugError, ReservedClubSlugError } from "./errors";

describe("HU-02: ClubSlug (link único del club)", () => {
  test.each([
    ["Vóley Miraflores", "voley-miraflores"],
    ["  Club__Ñaña!! ", "club-nana"],
  ])("HU-02: normaliza %j a %j", (raw, expected) => {
    expect(ClubSlug.create(raw).value).toBe(expected);
  });

  test.each([["ab"], ["a".repeat(41)], ["!!!"]])("HU-02: rechaza %j", (raw) => {
    expect(() => ClubSlug.create(raw)).toThrow(InvalidClubSlugError);
  });

  test.each([["admin"], ["ingresar"], ["Admin"], ["logos"]])(
    "HU-02: el slug reservado %j no se puede usar",
    (raw) => {
      expect(() => ClubSlug.create(raw)).toThrow(ReservedClubSlugError);
    },
  );
});
