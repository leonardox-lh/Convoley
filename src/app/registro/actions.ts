"use server";

import { z } from "zod";
import {
  EmailAlreadyRegisteredError,
  InvalidPasswordError,
  PASSWORD_MIN_LENGTH,
  registerOrganizer,
} from "@/modules/identity";
import {
  RETURN_PATH_PARAM,
  safeReturnPath,
  signInWithPassword,
} from "../ingresar/sign-in-with-password";

export type SignUpState = { status: "idle" } | { status: "error"; message: string };

const NAME_MAX_LENGTH = 80;

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre.")
    .max(NAME_MAX_LENGTH, "Tu nombre es muy largo."),
  email: z.email("Escribe un correo válido."),
  password: z.string(),
});

const PASSWORD_MESSAGES: Record<InvalidPasswordError["reason"], string> = {
  too_short: `Tu contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  too_long: "Tu contraseña es muy larga.",
};

export async function signUpAction(
  _previous: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  try {
    await registerOrganizer(parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return {
        status: "error",
        message: "Ese correo ya tiene cuenta. Ingresa o recupera tu contraseña.",
      };
    }
    if (error instanceof InvalidPasswordError) {
      return { status: "error", message: PASSWORD_MESSAGES[error.reason] };
    }
    throw error;
  }

  const returnPath = safeReturnPath(formData.get(RETURN_PATH_PARAM));
  return { status: "error", message: await signInWithPassword(parsed.data, returnPath) };
}
