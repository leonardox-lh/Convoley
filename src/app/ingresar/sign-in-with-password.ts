import { AuthError, SIGN_IN_ERROR_CODES, signIn } from "@/modules/identity";

/** Where every sign-in lands; /admin then sends you to your club or to create one. */
export const AFTER_SIGN_IN_PATH = "/admin";

const INVALID_MESSAGE = "Correo o contraseña incorrectos.";
const TOO_MANY_MESSAGE = "Hiciste muchos intentos. Espera 15 minutos y vuelve a probar.";

/**
 * Signs in with email + password and redirects. Returns an error message only when the
 * credentials are rejected; shared with sign-up, which signs in right after creating the account.
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<string> {
  try {
    await signIn("credentials", { ...input, redirectTo: AFTER_SIGN_IN_PATH });
  } catch (error) {
    // signIn redirects by throwing; only Auth.js errors are a failed sign-in.
    if (!(error instanceof AuthError)) throw error;
    const code = "code" in error ? error.code : undefined;
    return code === SIGN_IN_ERROR_CODES.tooMany ? TOO_MANY_MESSAGE : INVALID_MESSAGE;
  }
  // Unreachable: a successful signIn always redirects.
  return INVALID_MESSAGE;
}
