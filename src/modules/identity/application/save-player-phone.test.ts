import { describe, expect, it } from "vitest";
import type { PlayerProfile, PlayerProfileRepository } from "./ports";
import { makeSavePlayerPhone } from "./save-player-phone";

function fakeProfiles(profile: PlayerProfile | null) {
  const saved: string[] = [];
  const profiles: PlayerProfileRepository = {
    find: async () => profile,
    setPhone: async (_userId, phone) => void saved.push(phone),
  };
  return { profiles, saved };
}

describe("HU-48 criterio 3: la primera vez solo pide el celular", () => {
  it("HU-48: guarda el celular en una cuenta que aún no lo tiene", async () => {
    const { profiles, saved } = fakeProfiles({ firstName: "Ana", lastName: "Paz", phone: null });
    await makeSavePlayerPhone({ profiles })({ userId: "u1", phone: "+51987654321" });
    expect(saved).toEqual(["+51987654321"]);
  });

  it("HU-48: no cambia el celular de una cuenta que ya lo tiene", async () => {
    const { profiles, saved } = fakeProfiles({
      firstName: "Ana",
      lastName: "Paz",
      phone: "+51911111111",
    });
    await makeSavePlayerPhone({ profiles })({ userId: "u1", phone: "+51987654321" });
    expect(saved).toEqual([]);
  });
});
