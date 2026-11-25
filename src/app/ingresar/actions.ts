"use server";

import { z } from "zod";
import { PASSWORD_MAX_LENGTH, signIn } from "@/modules/identity";
import { RETURN_PATH_PARAM, safeReturnPath, signInWithPassword } from "./sign-in-with-password";

export type SignInState = { status: "idle" } | { status: "error"; message: string };

const signInSchema = z.object({
  email: z.email("Escribe un correo válido."),
  // The max keeps a huge string from making scrypt do extra work.
  password: z
    .string()
    .min(1, "Escribe tu contraseña.")
    .max(PASSWORD_MAX_LENGTH, "Correo o contraseña incorrectos."),
});

export async function signInWithPasswordAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const returnPath = safeReturnPath(formData.get(RETURN_PATH_PARAM));
  return { status: "error", message: await signInWithPassword(parsed.data, returnPath) };
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeReturnPath(formData.get(RETURN_PATH_PARAM)) });
}
