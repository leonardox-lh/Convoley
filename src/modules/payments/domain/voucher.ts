import { InvalidSecurityCodeError, InvalidVoucherTypeError, VoucherTooLargeError } from "./errors";

/** Phone screenshots weigh 1–4 MB; 5 MB leaves room without accepting huge photos. */
export const MAX_VOUCHER_BYTES = 5 * 1024 * 1024;

const VOUCHER_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type VoucherContentType = keyof typeof VOUCHER_EXTENSIONS;

export interface VoucherImage {
  bytes: Uint8Array;
  contentType: string;
}

/** Checks size and format of the payment screenshot; returns the extension to store it with. */
export function validateVoucherImage(image: VoucherImage): {
  contentType: VoucherContentType;
  extension: string;
} {
  if (image.bytes.byteLength > MAX_VOUCHER_BYTES) {
    throw new VoucherTooLargeError(image.bytes.byteLength);
  }
  if (!(image.contentType in VOUCHER_EXTENSIONS)) {
    throw new InvalidVoucherTypeError(image.contentType);
  }
  const contentType = image.contentType as VoucherContentType;
  return { contentType, extension: VOUCHER_EXTENSIONS[contentType] };
}

// Yape shows a 3-digit security code; a little slack avoids rejecting other wallets' codes.
const SECURITY_CODE = /^\d{3,6}$/;

/** The optional Yape security code: blank means none. */
export function parseSecurityCode(raw: string | null | undefined): string | null {
  const code = raw?.trim() ?? "";
  if (!code) return null;
  if (!SECURITY_CODE.test(code)) throw new InvalidSecurityCodeError();
  return code;
}
