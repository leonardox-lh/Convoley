import { InvalidLogoTypeError, LogoTooLargeError } from "./errors";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const LOGO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type LogoContentType = keyof typeof LOGO_EXTENSIONS;

export interface LogoUpload {
  bytes: Uint8Array;
  contentType: string;
}

/** Checks the 2 MB limit and the allowed formats; returns the file extension to store it with. */
export function validateLogo(logo: LogoUpload): {
  contentType: LogoContentType;
  extension: string;
} {
  if (logo.bytes.byteLength > MAX_LOGO_BYTES) throw new LogoTooLargeError(logo.bytes.byteLength);
  if (!(logo.contentType in LOGO_EXTENSIONS)) throw new InvalidLogoTypeError(logo.contentType);
  const contentType = logo.contentType as LogoContentType;
  return { contentType, extension: LOGO_EXTENSIONS[contentType] };
}
