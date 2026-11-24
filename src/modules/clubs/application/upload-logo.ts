import { validateLogo, type LogoUpload } from "../domain/logo";
import type { LogoStorage } from "./ports";

/** Stores the logo under a new key, so browsers never show a cached old logo. Returns the key. */
export async function uploadLogo(storage: LogoStorage, slug: string, logo: LogoUpload) {
  const { contentType, extension } = validateLogo(logo);
  const key = `${slug}-${crypto.randomUUID()}.${extension}`;
  await storage.save({ key, bytes: logo.bytes, contentType });
  return key;
}
