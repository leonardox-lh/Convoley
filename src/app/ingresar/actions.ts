"use server";

import { z } from "zod";
import { PASSWORD_MAX_LENGTH, signIn } from "@/modules/identity";
import { AFTER_SIGN_IN_PATH, signInWithPassword } from "./sign-in-with-password";

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
  return { status: "error", message: await signInWithPassword(parsed.data) };
}

export async function signInWithGoogleAction(): Promise<void> {
  await signIn("google", { redirectTo: AFTER_SIGN_IN_PATH });
}
