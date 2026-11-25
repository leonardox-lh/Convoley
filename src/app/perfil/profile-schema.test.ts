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
    expect(parsed).toEqual({ firstName: "Ana", lastName: "Paz", phone: "+51987654321" });
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
});
