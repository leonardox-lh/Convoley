import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

/** Random token for the link; only its hash is stored, so a database leak can't reset passwords. */
export function generateResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
