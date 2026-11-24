import { describe, expect, it } from "vitest";
import {
  CommunityInUseError,
  CommunityNameTakenError,
  CommunityNotFoundError,
  LastCommunityError,
} from "../domain/errors";
import {
  makeCreateCommunity,
  makeDeleteCommunity,
  makeListCommunities,
  makeRenameCommunity,
} from "./communities";
import { fakeCommunityRepository } from "./fakes";

const general = { id: "com-general", clubId: "club-1", name: "General" };
const amateur = { id: "com-amateur", clubId: "club-1", name: "Amateur" };
const otherClub = { id: "com-other", clubId: "club-2", name: "Otro" };

describe("HU-09 criterio 1: crear, editar y eliminar comunidades", () => {
  it("HU-09: crea una comunidad", async () => {
    const { repository } = fakeCommunityRepository([general]);
    await makeCreateCommunity({ communities: repository })({
      clubSlug: "club-1",
      name: " Amateur ",
    });
    const all = await makeListCommunities({ communities: repository })("club-1");
    expect(all.map((community) => community.name)).toEqual(["General", "Amateur"]);
  });

  it("HU-09: no repite un nombre en el mismo club", async () => {
    const { repository } = fakeCommunityRepository([general]);
    await expect(
      makeCreateCommunity({ communities: repository })({ clubSlug: "club-1", name: "General" }),
    ).rejects.toThrow(CommunityNameTakenError);
  });

  it("HU-09: renombra una comunidad", async () => {
    const { repository, rows } = fakeCommunityRepository([general]);
    await makeRenameCommunity({ communities: repository })({
      clubSlug: "club-1",
      communityId: "com-general",
      name: "Competitivo",
    });
    expect(rows[0].name).toBe("Competitivo");
  });

  it("HU-09: no toca comunidades de otro club", async () => {
    const { repository } = fakeCommunityRepository([general, otherClub]);
    await expect(
      makeRenameCommunity({ communities: repository })({
        clubSlug: "club-1",
        communityId: "com-other",
        name: "Mía",
      }),
    ).rejects.toThrow(CommunityNotFoundError);
  });

  it("HU-09: elimina una comunidad sin convocatorias", async () => {
    const { repository, rows } = fakeCommunityRepository([general, amateur]);
    await makeDeleteCommunity({ communities: repository })({
      clubSlug: "club-1",
      communityId: "com-amateur",
    });
    expect(rows.map((row) => row.id)).toEqual(["com-general"]);
  });
});

describe("HU-09 criterio 2: cada convocatoria pertenece a una comunidad", () => {
  it("HU-09: no elimina una comunidad con convocatorias", async () => {
    const { repository } = fakeCommunityRepository([general, amateur], ["com-amateur"]);
    await expect(
      makeDeleteCommunity({ communities: repository })({
        clubSlug: "club-1",
        communityId: "com-amateur",
      }),
    ).rejects.toThrow(CommunityInUseError);
  });

  it("HU-09: el club siempre conserva al menos una comunidad", async () => {
    const { repository } = fakeCommunityRepository([general]);
    await expect(
      makeDeleteCommunity({ communities: repository })({
        clubSlug: "club-1",
        communityId: "com-general",
      }),
    ).rejects.toThrow(LastCommunityError);
  });
});
