import { describe, expect, it } from "vitest";
import { InvalidSecurityCodeError, InvalidVoucherTypeError, VoucherTooLargeError } from "./errors";
import { MAX_VOUCHER_BYTES, parseSecurityCode, validateVoucherImage } from "./voucher";

const image = (bytes: number, contentType = "image/jpeg") => ({
  bytes: new Uint8Array(bytes),
  contentType,
});

describe("HU-14 criterio 1: acepta una imagen de la galería del celular", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("HU-14: acepta %s", (contentType, extension) => {
    expect(validateVoucherImage(image(1000, contentType)).extension).toBe(extension);
  });

  it("HU-14: rechaza lo que no es imagen", () => {
    expect(() => validateVoucherImage(image(1000, "application/pdf"))).toThrow(
      InvalidVoucherTypeError,
    );
  });

  it("HU-14: rechaza imágenes de más de 5 MB", () => {
    expect(() => validateVoucherImage(image(MAX_VOUCHER_BYTES + 1))).toThrow(VoucherTooLargeError);
  });
});

describe("HU-14 criterio 2: código de seguridad de Yape opcional", () => {
  it("HU-14: vacío significa sin código", () => {
    expect(parseSecurityCode("  ")).toBeNull();
    expect(parseSecurityCode(undefined)).toBeNull();
  });

  it("HU-14: guarda el código de 3 dígitos", () => {
    expect(parseSecurityCode(" 482 ")).toBe("482");
  });

  it.each(["12", "abc", "1234567"])("HU-14: rechaza %j", (raw) => {
    expect(() => parseSecurityCode(raw)).toThrow(InvalidSecurityCodeError);
  });
});
