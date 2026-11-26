import { describe, expect, it, vi } from "vitest";
import { profileSchema } from "./profile-schema";

// The module's index opens the database; the phone rule itself is pure.
vi.mock("@/modules/registrations", async () => ({
  PhoneNumber: (await import("@/modules/registrations/domain/phone-number")).PhoneNumber,
}));

describe("perfil: editar mis datos", () => {
  it("normaliza el celular a +519XXXXXXXX", () => {
    const parsed = profileSchema.parse({
      firstName: " Ana ",
      lastName: "Paz",
      phone: "987 654 321",
    });
    expect(parsed).toEqual({
      firstName: "Ana",
      lastName: "Paz",
      phone: "+51987654321",
      position: null,
      level: null,
      gender: null,
    });
  });

  it("permite dejar el celular vacío", () => {
    expect(profileSchema.parse({ firstName: "Ana", lastName: "", phone: "" }).phone).toBeNull();
  });

  it("rechaza un celular que no es peruano", () => {
    const result = profileSchema.safeParse({ firstName: "Ana", lastName: "", phone: "812345678" });
    expect(result.success).toBe(false);
  });

  it("pide el nombre", () => {
    const result = profileSchema.safeParse({ firstName: "  ", lastName: "Paz", phone: "" });
    expect(result.success).toBe(false);
  });

  it("guarda posición y nivel, y '—' los borra", () => {
    const base = { firstName: "Ana", lastName: "", phone: "" };
    expect(profileSchema.parse({ ...base, position: "setter", level: "advanced" })).toMatchObject({
      position: "setter",
      level: "advanced",
    });
    expect(profileSchema.parse({ ...base, position: "", level: "" })).toMatchObject({
      position: null,
      level: null,
      gender: null,
    });
  });

  it("guarda si juega como chica o chico, y '—' lo borra", () => {
    const base = { firstName: "Ana", lastName: "", phone: "" };
    expect(profileSchema.parse({ ...base, gender: "female" }).gender).toBe("female");
    expect(profileSchema.parse({ ...base, gender: "" }).gender).toBeNull();
    expect(profileSchema.safeParse({ ...base, gender: "other" }).success).toBe(false);
  });

  it("rechaza una posición que no existe", () => {
    const result = profileSchema.safeParse({
      firstName: "Ana",
      lastName: "",
      phone: "",
      position: "goalkeeper",
    });
    expect(result.success).toBe(false);
  });
});
