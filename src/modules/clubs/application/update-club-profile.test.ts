import { describe, expect, test } from "vitest";
import { ClubNotFoundError, InvalidColorError } from "../domain/errors";
import { fakeClubRepository, fakeLogoStorage, profileProps } from "./fakes";
import { makeUpdateClubProfile } from "./update-club-profile";

const png = { bytes: new Uint8Array(100), contentType: "image/png" };

function setup(logoKey: string | null = "old.png") {
  const repo = fakeClubRepository([{ slug: "mi-club", logoKey, ...profileProps() }]);
  const logos = fakeLogoStorage();
  const update = makeUpdateClubProfile({ clubs: repo.repository, logos: logos.storage });
  return { repo, logos, update };
}

describe("HU-02: updateClubProfile (editable en cualquier momento)", () => {
  test("HU-02: cambia los campos del perfil", async () => {
    const { update, repo } = setup();
    await update({
      clubSlug: "mi-club",
      profile: profileProps({
        name: "Nuevo nombre",
        description: "Hola",
        primaryColor: "#FF0000",
        instagramUrl: "instagram.com/club",
      }),
      logo: null,
    });
    expect(repo.clubs.get("mi-club")).toMatchObject({
      name: "Nuevo nombre",
      description: "Hola",
      primaryColor: "#ff0000",
      instagramUrl: "https://instagram.com/club",
    });
  });

  test("HU-02: sin logo nuevo conserva el actual", async () => {
    const { update, repo } = setup();
    await update({ clubSlug: "mi-club", profile: profileProps({ name: "X" }), logo: null });
    expect(repo.clubs.get("mi-club")?.logoKey).toBe("old.png");
  });

  test("HU-02: un logo nuevo reemplaza la key", async () => {
    const { update, repo, logos } = setup();
    await update({ clubSlug: "mi-club", profile: profileProps(), logo: png });
    const logoKey = repo.clubs.get("mi-club")?.logoKey;
    expect(logoKey).not.toBe("old.png");
    expect(logoKey).toMatch(/^[a-z0-9-]+\.png$/);
    expect(logos.saved.has(logoKey!)).toBe(true);
  });

  test("HU-02: un club inexistente da ClubNotFoundError", async () => {
    const { update } = setup();
    await expect(
      update({ clubSlug: "no-existe", profile: profileProps(), logo: null }),
    ).rejects.toThrow(ClubNotFoundError);
  });

  test("HU-02: un color inválido se rechaza y no cambia nada", async () => {
    const { update, repo } = setup();
    await expect(
      update({ clubSlug: "mi-club", profile: profileProps({ primaryColor: "rojo" }), logo: null }),
    ).rejects.toThrow(InvalidColorError);
    expect(repo.clubs.get("mi-club")?.primaryColor).toBeNull();
  });
});
