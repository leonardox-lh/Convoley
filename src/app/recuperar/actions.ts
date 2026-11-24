"use server";

import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import {
  InvalidPasswordError,
  PASSWORD_MIN_LENGTH,
  requestPasswordReset,
  resetPassword,
  ResetTokenExpiredError,
  ResetTokenInvalidError,
} from "@/modules/identity";

export type RequestResetState =
  { status: "idle" } | { status: "error"; message: string } | { status: "sent" };

export type ResetPasswordState =
  { status: "idle" } | { status: "error"; message: string } | { status: "done" };

const requestSchema = z.object({ email: z.email("Escribe un correo válido.") });
const resetSchema = z.object({ token: z.string().min(1), password: z.string() });

export async function requestPasswordResetAction(
  _previous: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const baseUrl = await appUrl();
  try {
    await requestPasswordReset({
      email: parsed.data.email,
      linkFor: (token) => `${baseUrl}/recuperar/${token}`,
    });
  } catch (error) {
    // Only accounts that exist reach the email provider, so a failure there must not change
    // the answer: it would reveal that the email has an account.
    console.error("Password reset request failed", error);
  }
  // Same answer whether or not the email has an account.
  return { status: "sent" };
}

export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Este link no es válido." };

  try {
    await resetPassword(parsed.data);
    return { status: "done" };
  } catch (error) {
    if (error instanceof InvalidPasswordError) {
      return {
        status: "error",
        message:
          error.reason === "too_short"
            ? `Tu contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
            : "Tu contraseña es muy larga.",
      };
    }
    if (error instanceof ResetTokenExpiredError) {
      return { status: "error", message: "Este link venció. Pide uno nuevo." };
    }
    if (error instanceof ResetTokenInvalidError) {
      return { status: "error", message: "Este link ya se usó o no es válido. Pide uno nuevo." };
    }
    throw error;
  }
}
