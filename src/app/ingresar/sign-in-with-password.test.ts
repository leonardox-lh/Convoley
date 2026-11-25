import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/identity", () => ({
  AuthError: Error,
  SIGN_IN_ERROR_CODES: {},
  signIn: vi.fn(),
}));

const { AFTER_SIGN_IN_PATH, safeReturnPath } = await import("./sign-in-with-password");

describe("HU-33: después de ingresar vuelve al link de invitación", () => {
  it("HU-33: acepta rutas de Convoley", () => {
    expect(safeReturnPath("/invitacion/abc")).toBe("/invitacion/abc");
  });

  it.each(["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", undefined, ["/a"]])(
    "HU-33: ignora %s y va al admin",
    (value) => {
      expect(safeReturnPath(value)).toBe(AFTER_SIGN_IN_PATH);
    },
  );
});
