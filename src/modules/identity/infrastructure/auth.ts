import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { CredentialsSignin } from "next-auth";
export { AuthError } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { InvalidCredentialsError, TooManyAttemptsError } from "../domain/errors";
import { PASSWORD_MAX_LENGTH } from "../domain/password";

declare module "next-auth" {
  interface User {
    firstName?: string | null;
    lastName?: string | null;
  }
}

export const SIGN_IN_PATH = "/ingresar";
/** Codes the login form turns into messages; they travel in the URL, so they say nothing sensitive. */
export const SIGN_IN_ERROR_CODES = { invalid: "invalid", tooMany: "too_many" } as const;

class SignInFailed extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

const credentialsSchema = z.object({
  email: z.string(),
  password: z.string().max(PASSWORD_MAX_LENGTH),
});

export const isGoogleSignInEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

export function createAuth(
  verifyCredentials: (input: {
    email: string;
    password: string;
  }) => Promise<{ id: string; email: string }>,
) {
  const providers: Provider[] = [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new SignInFailed(SIGN_IN_ERROR_CODES.invalid);
        try {
          return await verifyCredentials(parsed.data);
        } catch (error) {
          if (error instanceof InvalidCredentialsError)
            throw new SignInFailed(SIGN_IN_ERROR_CODES.invalid);
          if (error instanceof TooManyAttemptsError)
            throw new SignInFailed(SIGN_IN_ERROR_CODES.tooMany);
          throw error;
        }
      },
    }),
  ];
  if (isGoogleSignInEnabled) {
    providers.push(
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
        // Keeps first and last name apart so registrations autocomplete them (HU-48).
        profile: (profile) => ({
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          firstName: profile.given_name,
          lastName: profile.family_name,
        }),
      }),
    );
  }

  return NextAuth({
    adapter: PrismaAdapter(db),
    // Credentials sign-in only works with JWT sessions in Auth.js.
    session: { strategy: "jwt" },
    // A Google account is never auto-linked to an existing email+password account: sign-up
    // doesn't verify the email, so linking would hand that account to whoever registered it.
    providers,
    pages: { signIn: SIGN_IN_PATH, error: SIGN_IN_PATH },
    callbacks: {
      session({ session, token }) {
        if (token.sub) session.user.id = token.sub;
        return session;
      },
    },
  });
}
