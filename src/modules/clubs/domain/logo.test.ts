import { describe, expect, test } from "vitest";
import { InvalidLogoTypeError, LogoTooLargeError } from "./errors";
import { MAX_LOGO_BYTES, validateLogo } from "./logo";

const logo = (size: number, contentType = "image/png") => ({
  bytes: new Uint8Array(size),
  contentType,
});

describe("HU-02: validateLogo (hasta 2 MB)", () => {
  test("HU-02: el límite es 2 MB", () => {
    expect(MAX_LOGO_BYTES).toBe(2 * 1024 * 1024);
  });

  test("HU-02: acepta un logo de exactamente 2 MB", () => {
    expect(validateLogo(logo(MAX_LOGO_BYTES))).toEqual({
      contentType: "image/png",
      extension: "png",
    });
  });

  test("HU-02: rechaza un logo de 2 MB + 1 byte", () => {
    expect(() => validateLogo(logo(MAX_LOGO_BYTES + 1))).toThrow(LogoTooLargeError);
  });

  test.each([
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ])("HU-02: acepta %s como .%s", (type, extension) => {
    expect(validateLogo(logo(10, type)).extension).toBe(extension);
  });

  test.each([["image/gif"], ["application/pdf"], ["image/svg+xml"]])(
    "HU-02: rechaza el formato %s",
    (type) => {
      expect(() => validateLogo(logo(10, type))).toThrow(InvalidLogoTypeError);
    },
  );
});
