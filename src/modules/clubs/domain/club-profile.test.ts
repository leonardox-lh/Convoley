import { describe, expect, test } from "vitest";
import { validateClubProfile, type ClubProfileProps } from "./club-profile";
import { InvalidColorError, InvalidContactPhoneError, InvalidSocialLinkError } from "./errors";

const profile = (overrides: Partial<ClubProfileProps> = {}): ClubProfileProps => ({
  name: "Club",
  description: null,
  primaryColor: null,
  secondaryColor: null,
  instagramUrl: null,
  tiktokUrl: null,
  whatsappUrl: null,
  contactPhone: null,
  ...overrides,
});

describe("HU-02: validateClubProfile (colores y redes)", () => {
  test("HU-02: normaliza el color hex a minúsculas", () => {
    expect(validateClubProfile(profile({ primaryColor: " #1D4ED8 " })).primaryColor).toBe(
      "#1d4ed8",
    );
  });

  test.each([["red"], ["#fff"], ["#12345g"], ["1d4ed8"]])("HU-02: rechaza el color %j", (raw) => {
    expect(() => validateClubProfile(profile({ secondaryColor: raw }))).toThrow(InvalidColorError);
  });

  test.each([
    ["https://instagram.com/club", "https://instagram.com/club"],
    ["instagram.com/club", "https://instagram.com/club"],
    ["http://www.instagram.com/club", "https://www.instagram.com/club"],
  ])("HU-02: acepta el Instagram %j", (raw, expected) => {
    expect(validateClubProfile(profile({ instagramUrl: raw })).instagramUrl).toBe(expected);
  });

  test("HU-02: acepta TikTok con y sin https", () => {
    expect(validateClubProfile(profile({ tiktokUrl: "tiktok.com/@club" })).tiktokUrl).toBe(
      "https://tiktok.com/@club",
    );
    expect(validateClubProfile(profile({ tiktokUrl: "https://tiktok.com/@club" })).tiktokUrl).toBe(
      "https://tiktok.com/@club",
    );
  });

  test.each([["https://facebook.com/club"], ["instagram.com"], ["https://instagram.com/"]])(
    "HU-02: rechaza el Instagram %j (otro sitio o sin perfil)",
    (raw) => {
      expect(() => validateClubProfile(profile({ instagramUrl: raw }))).toThrow(
        InvalidSocialLinkError,
      );
    },
  );

  test("HU-02: no acepta un link de Instagram en el campo de TikTok", () => {
    expect(() => validateClubProfile(profile({ tiktokUrl: "instagram.com/club" }))).toThrow(
      InvalidSocialLinkError,
    );
  });

  test("HU-02: null pasa sin cambios", () => {
    expect(validateClubProfile(profile())).toEqual(profile());
  });
});

describe("link de la comunidad de WhatsApp", () => {
  test("acepta invitaciones de grupo o comunidad y canales", () => {
    expect(
      validateClubProfile(profile({ whatsappUrl: "chat.whatsapp.com/AbC123" })).whatsappUrl,
    ).toBe("https://chat.whatsapp.com/AbC123");
    expect(
      validateClubProfile(profile({ whatsappUrl: "https://whatsapp.com/channel/0029Va" }))
        .whatsappUrl,
    ).toBe("https://whatsapp.com/channel/0029Va");
  });

  test("rechaza links que no son de WhatsApp", () => {
    expect(() => validateClubProfile(profile({ whatsappUrl: "evil.com/x" }))).toThrow(
      InvalidSocialLinkError,
    );
  });
});

describe("WhatsApp del administrador", () => {
  test("acepta un celular peruano normalizado y lo rechaza si no lo está", () => {
    expect(validateClubProfile(profile({ contactPhone: "+51987654321" })).contactPhone).toBe(
      "+51987654321",
    );
    expect(() => validateClubProfile(profile({ contactPhone: "987654321" }))).toThrow(
      InvalidContactPhoneError,
    );
  });
});
