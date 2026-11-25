import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { makeRegisterOrganizer } from "./application/register-organizer";
import { makeRequestPasswordReset } from "./application/request-password-reset";
import { makeSavePlayerPhone } from "./application/save-player-phone";
import { makeResetPassword } from "./application/reset-password";
import { makeVerifyCredentials } from "./application/verify-credentials";
import { createAuth } from "./infrastructure/auth";
import { consoleEmailSender, resendEmailSender } from "./infrastructure/email-senders";
import {
  isPlatformAdmin as checkPlatformAdmin,
  parseAdminEmails,
} from "./infrastructure/platform-admin";
import { inMemoryAttemptLimiter } from "./infrastructure/in-memory-attempt-limiter";
import { prismaPasswordResetTokenRepository } from "./infrastructure/prisma-password-reset-token-repository";
import { prismaPlayerProfileRepository } from "./infrastructure/prisma-player-profile-repository";
import { prismaUserAccountRepository } from "./infrastructure/prisma-user-account-repository";
import { scryptPasswordHasher } from "./infrastructure/scrypt-password-hasher";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const users = prismaUserAccountRepository(db);
const tokens = prismaPasswordResetTokenRepository(db);
const hasher = scryptPasswordHasher;
const limiter = inMemoryAttemptLimiter({ maxAttempts: MAX_ATTEMPTS, windowMs: ATTEMPT_WINDOW_MS });
const now = () => new Date();
// env.ts requires the Resend key in production, so the console sender only runs locally.
const email =
  env.RESEND_API_KEY && env.EMAIL_FROM
    ? resendEmailSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })
    : consoleEmailSender;

export const registerOrganizer = makeRegisterOrganizer({ users, hasher });
const verifyCredentials = makeVerifyCredentials({ users, hasher, limiter });
export const requestPasswordReset = makeRequestPasswordReset({
  users,
  tokens,
  email,
  limiter,
  now,
});
export const resetPassword = makeResetPassword({ tokens, hasher, now });

const profiles = prismaPlayerProfileRepository(db);
export const getPlayerProfile = (userId: string) => profiles.find(userId);
export const savePlayerPhone = makeSavePlayerPhone({ profiles });
export type { PlayerProfile } from "./application/ports";

export const { handlers, auth, signIn, signOut } = createAuth(verifyCredentials);

/** Id of the signed-in user, or null. Reads cookies: call it inside <Suspense>. */
export async function currentUserId(): Promise<string | null> {
  return (await auth())?.user?.id ?? null;
}

export { AuthError } from "./infrastructure/auth";
export { isGoogleSignInEnabled, SIGN_IN_ERROR_CODES, SIGN_IN_PATH } from "./infrastructure/auth";
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./domain/password";
export {
  EmailAlreadyRegisteredError,
  InvalidPasswordError,
  PhoneLinkedToAnotherAccountError,
  ResetTokenExpiredError,
  ResetTokenInvalidError,
} from "./domain/errors";

const platformAdminEmails = parseAdminEmails(env.PLATFORM_ADMIN_EMAILS);
/** HU-36: whether the user is a Convoley owner (platform admin panel). */
export const isPlatformAdmin = (userId: string) =>
  checkPlatformAdmin(db, platformAdminEmails, userId);
