import { z } from "zod";
import { AuthError, SIGN_IN_ERROR_CODES, signIn } from "@/modules/identity";

/** Where every sign-in lands; /admin then sends you to your club or to create one. */
export const AFTER_SIGN_IN_PATH = "/admin";

/** Query param that brings the user back after signing in, e.g. to an invitation (HU-33). */
export const RETURN_PATH_PARAM = "volver";

// Only paths of this site: "//evil.com" or "/\evil.com" would leave it (open redirect). Control
// characters are refused too: browsers strip tabs, so "/\t/evil.com" would become "//evil.com".
const returnPathSchema = z.string().regex(/^\/(?![/\\])[^\x00-\x1f]*$/);

export function safeReturnPath(value: unknown): string {
  const parsed = returnPathSchema.safeParse(value);
  return parsed.success ? parsed.data : AFTER_SIGN_IN_PATH;
}

const INVALID_MESSAGE = "Correo o contraseña incorrectos.";
const TOO_MANY_MESSAGE = "Hiciste muchos intentos. Espera 15 minutos y vuelve a probar.";

/**
 * Signs in with email + password and redirects. Returns an error message only when the
 * credentials are rejected; shared with sign-up, which signs in right after creating the account.
 */
export async function signInWithPassword(
  input: { email: string; password: string },
  redirectTo: string = AFTER_SIGN_IN_PATH,
): Promise<string> {
  try {
    await signIn("credentials", { ...input, redirectTo });
  } catch (error) {
    // signIn redirects by throwing; only Auth.js errors are a failed sign-in.
    if (!(error instanceof AuthError)) throw error;
    const code = "code" in error ? error.code : undefined;
    return code === SIGN_IN_ERROR_CODES.tooMany ? TOO_MANY_MESSAGE : INVALID_MESSAGE;
  }
  // Unreachable: a successful signIn always redirects.
  return INVALID_MESSAGE;
}
