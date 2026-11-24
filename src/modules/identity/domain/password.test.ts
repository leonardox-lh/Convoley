import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./email";
import { InvalidPasswordError } from "./errors";
import { Password, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password";

describe("Password", () => {
  it("accepts the minimum and maximum lengths", () => {
    expect(Password.create("a".repeat(PASSWORD_MIN_LENGTH)).value).toHaveLength(
      PASSWORD_MIN_LENGTH,
    );
    expect(Password.create("a".repeat(PASSWORD_MAX_LENGTH)).value).toHaveLength(
      PASSWORD_MAX_LENGTH,
    );
  });

  it("rejects a password that is too short", () => {
    expect(() => Password.create("a".repeat(PASSWORD_MIN_LENGTH - 1))).toThrow(
      new InvalidPasswordError("too_short"),
    );
  });

  it("rejects a password that is too long", () => {
    expect(() => Password.create("a".repeat(PASSWORD_MAX_LENGTH + 1))).toThrow(
      new InvalidPasswordError("too_long"),
    );
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ana@Club.PE ")).toBe("ana@club.pe");
  });
});
