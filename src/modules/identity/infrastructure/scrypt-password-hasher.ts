import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { PasswordHasher } from "../application/ports";

// node:crypto scrypt instead of a native argon2 package: no binary to build on Railway/Windows.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// scrypt needs 128 * N * r bytes; the default 32 MiB cap is exactly that, so leave headroom.
const MAX_MEMORY = 64 * 1024 * 1024;
const PREFIX = "scrypt";

function derive(plain: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(plain, salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

/** Stores `scrypt$N$r$p$salt$hash` so the cost can be raised later without breaking old hashes. */
export const scryptPasswordHasher: PasswordHasher = {
  async hash(plain) {
    const salt = randomBytes(SALT_BYTES);
    const options = { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: MAX_MEMORY };
    const key = await derive(plain, salt, options);
    return [
      PREFIX,
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString("base64"),
      key.toString("base64"),
    ].join("$");
  },

  async verify(plain, stored) {
    const [prefix, n, r, p, salt, hash] = stored.split("$");
    if (prefix !== PREFIX || !salt || !hash) return false;
    const expected = Buffer.from(hash, "base64");
    const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEMORY };
    const key = await derive(plain, Buffer.from(salt, "base64"), options);
    return key.length === expected.length && timingSafeEqual(key, expected);
  },
};
