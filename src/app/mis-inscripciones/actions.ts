"use server";

import { signIn } from "@/modules/identity";

export async function signInToMyRegistrationsAction(): Promise<void> {
  await signIn("google", { redirectTo: "/mis-inscripciones" });
}
