import { InvalidPhoneNumberError } from "./errors";

const PERU_COUNTRY_CODE = "+51";
const PERU_MOBILE = /^9\d{8}$/;
// People paste numbers like "987 654 321", "987-654-321" or "+51 987654321".
const SEPARATORS = /[\s-]/g;
const OPTIONAL_COUNTRY_PREFIX = /^\+?51(?=9\d{8}$)/;

/** A Peruvian mobile: 9 digits starting with 9, stored as +519XXXXXXXX. */
export class PhoneNumber {
  private constructor(readonly value: string) {}

  static parse(raw: string): PhoneNumber {
    const digits = raw.replace(SEPARATORS, "").replace(OPTIONAL_COUNTRY_PREFIX, "");
    if (!PERU_MOBILE.test(digits)) throw new InvalidPhoneNumberError(raw);
    return new PhoneNumber(`${PERU_COUNTRY_CODE}${digits}`);
  }
}
