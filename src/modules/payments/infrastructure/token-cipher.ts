import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

/** Encrypts a Mercado Pago token for storage as "iv.tag.ciphertext" (base64url). */
export function encryptToken(plain: string, keyBase64: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(keyBase64, "base64"), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

/** Throws if the value was altered or encrypted with another key (GCM authenticates it). */
export function decryptToken(stored: string, keyBase64: string): string {
  const [iv, tag, encrypted] = stored.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(keyBase64, "base64"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
