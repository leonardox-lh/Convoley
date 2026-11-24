import { describe, expect, it } from "vitest";
import { InvalidPhoneNumberError } from "./errors";
import { PhoneNumber } from "./phone-number";

describe("HU-06 criterio 2: celular peruano de 9 dígitos", () => {
  it.each([
    ["987654321", "+51987654321"],
    ["987 654 321", "+51987654321"],
    ["987-654-321", "+51987654321"],
    ["+51987654321", "+51987654321"],
    ["+51 987 654 321", "+51987654321"],
    ["51987654321", "+51987654321"],
  ])("HU-06: acepta %s y lo normaliza", (raw, expected) => {
    expect(PhoneNumber.parse(raw).value).toBe(expected);
  });

  it.each([
    ["8 dígitos", "98765432"],
    ["10 dígitos", "9876543210"],
    ["no empieza con 9", "887654321"],
    ["fijo de Lima", "012345678"],
    ["con letras", "98765abc1"],
    ["vacío", ""],
    ["otro país", "+54987654321"],
  ])("HU-06: rechaza %s", (_name, raw) => {
    expect(() => PhoneNumber.parse(raw)).toThrow(InvalidPhoneNumberError);
  });
});
