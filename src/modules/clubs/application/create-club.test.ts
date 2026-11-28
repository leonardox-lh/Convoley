import { describe, expect, test } from "vitest";
import {
  ClubAlreadyOwnedError,
  ClubSlugTakenError,
  InvalidColorError,
  LogoTooLargeError,
} from "../domain/errors";
import { MAX_LOGO_BYTES } from "../domain/logo";
import { makeCreateClub } from "./create-club";
import { fakeClubRepository, fakeLogoStorage, profileProps } from "./fakes";

const png = { bytes: new Uint8Array(100), contentType: "image/png" };

function setup() {
  const repo = fakeClubRepository();
  const logos = fakeLogoStorage();
  const createClub = makeCreateClub({ clubs: repo.repository, logos: logos.storage });
  return { repo, logos, createClub };
}

describe("HU-02: createClub", () => {
  test("HU-02: arma el link con el nombre cuando no se pide uno", async () => {
    const { createClub, repo } = setup();
    const result = await createClub({
      adminUserId: "u1",
      slug: "",
      profile: profileProps(),
      logo: null,
    });
    expect(result.slug).toBe("voley-miraflores");
    expect(repo.clubs.has("voley-miraflores")).toBe(true);
  });

  test("HU-02: usa el link pedido", async () => {
    const { createClub } = setup();
    const result = await createClub({
      adminUserId: "u1",
      slug: "Mi Club",
      profile: profileProps(),
      logo: null,
    });
    expect(result.slug).toBe("mi-club");
  });

  test("HU-02: no permite el mismo link dos veces", async () => {
    const { createClub } = setup();
    const input = { adminUserId: "u1", slug: "mi-club", profile: profileProps(), logo: null };
    await createClub(input);
    await expect(createClub({ ...input, adminUserId: "u2" })).rejects.toThrow(ClubSlugTakenError);
  });

  test("HU-02: un logo mayor a 2 MB se rechaza antes de crear el club", async () => {
    const { createClub, repo, logos } = setup();
    const big = { bytes: new Uint8Array(MAX_LOGO_BYTES + 1), contentType: "image/png" };
    await expect(
      createClub({ adminUserId: "u1", slug: "", profile: profileProps(), logo: big }),
    ).rejects.toThrow(LogoTooLargeError);
    expect(repo.clubs.size).toBe(0);
    expect(logos.saved.size).toBe(0);
  });

  test("HU-02: guarda el logo y su key en el club", async () => {
    const { createClub, repo, logos } = setup();
    await createClub({ adminUserId: "u1", slug: "", profile: profileProps(), logo: png });
    const logoKey = repo.clubs.get("voley-miraflores")?.logoKey;
    expect(logoKey).toMatch(/^[a-z0-9-]+\.(jpg|png|webp)$/);
    expect(logos.saved.get(logoKey!)?.contentType).toBe("image/png");
  });

  test("HU-02: registra al creador como admin", async () => {
    const { createClub, repo } = setup();
    await createClub({ adminUserId: "u1", slug: "", profile: profileProps(), logo: null });
    expect(repo.admins.get("voley-miraflores")).toBe("u1");
  });

  test("HU-02: un color inválido no crea el club", async () => {
    const { createClub, repo } = setup();
    await expect(
      createClub({
        adminUserId: "u1",
        slug: "",
        profile: profileProps({ primaryColor: "azul" }),
        logo: null,
      }),
    ).rejects.toThrow(InvalidColorError);
    expect(repo.clubs.size).toBe(0);
  });

  test("un usuario no puede crear un segundo club", async () => {
    const { createClub, repo } = setup();
    await createClub({ adminUserId: "u1", slug: "club-uno", profile: profileProps(), logo: null });
    await expect(
      createClub({ adminUserId: "u1", slug: "club-dos", profile: profileProps(), logo: null }),
    ).rejects.toThrow(ClubAlreadyOwnedError);
    expect(repo.clubs.has("club-dos")).toBe(false);
  });

  test("el segundo club se rechaza antes de subir su logo", async () => {
    const { createClub, logos } = setup();
    await createClub({ adminUserId: "u1", slug: "club-uno", profile: profileProps(), logo: null });
    await expect(
      createClub({ adminUserId: "u1", slug: "club-dos", profile: profileProps(), logo: png }),
    ).rejects.toThrow(ClubAlreadyOwnedError);
    expect(logos.saved.size).toBe(0);
  });

  test("dos pedidos a la vez del mismo usuario crean un solo club", async () => {
    const { createClub, repo } = setup();
    const results = await Promise.allSettled([
      createClub({ adminUserId: "u1", slug: "club-uno", profile: profileProps(), logo: null }),
      createClub({ adminUserId: "u1", slug: "club-dos", profile: profileProps(), logo: null }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(repo.clubs.size).toBe(1);
  });

  test("otro usuario sí puede crear su propio club", async () => {
    const { createClub, repo } = setup();
    await createClub({ adminUserId: "u1", slug: "club-uno", profile: profileProps(), logo: null });
    await createClub({ adminUserId: "u2", slug: "club-dos", profile: profileProps(), logo: null });
    expect(repo.clubs.size).toBe(2);
  });
});
