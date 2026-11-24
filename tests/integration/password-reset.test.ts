import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { makeRegisterOrganizer } from "@/modules/identity/application/register-organizer";
import { makeRequestPasswordReset } from "@/modules/identity/application/request-password-reset";
import { makeResetPassword } from "@/modules/identity/application/reset-password";
import { makeVerifyCredentials } from "@/modules/identity/application/verify-credentials";
import {
  InvalidCredentialsError,
  ResetTokenExpiredError,
  ResetTokenInvalidError,
} from "@/modules/identity/domain/errors";
import { prismaPasswordResetTokenRepository } from "@/modules/identity/infrastructure/prisma-password-reset-token-repository";
import { prismaUserAccountRepository } from "@/modules/identity/infrastructure/prisma-user-account-repository";
import { scryptPasswordHasher } from "@/modules/identity/infrastructure/scrypt-password-hasher";

config({ path: ".env.local", quiet: true });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set.");
const testUrl = new URL(TEST_DATABASE_URL);
// Guard: only ever touch a local *_test database.
if (!["localhost", "127.0.0.1"].includes(testUrl.hostname)) {
  throw new Error(`Refusing to run: host "${testUrl.hostname}" is not local.`);
}
if (!testUrl.pathname.slice(1).endsWith("_test")) {
  throw new Error("Refusing to run: database name does not end in _test.");
}

const OLD_PASSWORD = "clave-vieja-123";
const NEW_PASSWORD = "clave-nueva-456";
const OTHER_PASSWORD = "otra-clave-789";
const MINUTE_MS = 60 * 1000;
const LINK_PREFIX = "https://convoley.test/recuperar/";

let db: PrismaClient;
let clock = new Date();
const sentLinks: string[] = [];
const createdEmails: string[] = [];

function build() {
  const users = prismaUserAccountRepository(db);
  const tokens = prismaPasswordResetTokenRepository(db);
  const hasher = scryptPasswordHasher;
  const permissive = { isBlocked: () => false, record: () => undefined, clear: () => undefined };
  return {
    registerOrganizer: makeRegisterOrganizer({ users, hasher }),
    verifyCredentials: makeVerifyCredentials({ users, hasher, limiter: permissive }),
    requestPasswordReset: makeRequestPasswordReset({
      users,
      tokens,
      limiter: permissive,
      now: () => clock,
      email: { sendPasswordReset: async ({ link }) => void sentLinks.push(link) },
    }),
    resetPassword: makeResetPassword({ tokens, hasher, now: () => clock }),
  };
}

async function newUser() {
  const email = `hu01-${Date.now()}-${createdEmails.length}@convoley.test`;
  createdEmails.push(email);
  await build().registerOrganizer({ name: "HU-01", email, password: OLD_PASSWORD });
  return email;
}

async function requestLink(email: string) {
  await build().requestPasswordReset({ email, linkFor: (t) => `${LINK_PREFIX}${t}` });
  return sentLinks.at(-1)!.slice(LINK_PREFIX.length);
}

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
});

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: createdEmails } } });
  await db.$disconnect();
});

describe("password reset (Postgres)", () => {
  it("HU-01: el link cambia la contraseña: la nueva entra y la vieja ya no", async () => {
    clock = new Date();
    const email = await newUser();
    const token = await requestLink(email);
    const app = build();
    await app.resetPassword({ token, password: NEW_PASSWORD });

    await expect(app.verifyCredentials({ email, password: NEW_PASSWORD })).resolves.toMatchObject({
      email,
    });
    await expect(app.verifyCredentials({ email, password: OLD_PASSWORD })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("HU-01: usar el mismo link por segunda vez falla con ResetTokenInvalidError", async () => {
    clock = new Date();
    const token = await requestLink(await newUser());
    const app = build();
    await app.resetPassword({ token, password: NEW_PASSWORD });
    await expect(app.resetPassword({ token, password: OTHER_PASSWORD })).rejects.toBeInstanceOf(
      ResetTokenInvalidError,
    );
  });

  it("HU-01: pasados 61 minutos el link falla con ResetTokenExpiredError", async () => {
    clock = new Date();
    const token = await requestLink(await newUser());
    clock = new Date(clock.getTime() + 61 * MINUTE_MS);
    await expect(build().resetPassword({ token, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      ResetTokenExpiredError,
    );
  });

  it("HU-01: en la tabla solo se guarda el hash del token, nunca el token", async () => {
    clock = new Date();
    const email = await newUser();
    const token = await requestLink(email);
    const rows = await db.passwordResetToken.findMany({ where: { user: { email } } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(token);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("HU-01: pedir un segundo link invalida el primero", async () => {
    clock = new Date();
    const email = await newUser();
    const first = await requestLink(email);
    const second = await requestLink(email);
    const app = build();
    await expect(
      app.resetPassword({ token: first, password: NEW_PASSWORD }),
    ).rejects.toBeInstanceOf(ResetTokenInvalidError);
    await expect(
      app.resetPassword({ token: second, password: NEW_PASSWORD }),
    ).resolves.toBeUndefined();
  });

  it("HU-01: dos resetPassword simultáneos con el mismo token: solo uno tiene éxito", async () => {
    clock = new Date();
    const token = await requestLink(await newUser());
    const app = build();
    const results = await Promise.allSettled([
      app.resetPassword({ token, password: NEW_PASSWORD }),
      app.resetPassword({ token, password: OTHER_PASSWORD }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ResetTokenInvalidError);
  });
});
