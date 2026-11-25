"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { signInWithPasswordAction, type SignInState } from "./actions";

export function SignInForm({
  initialError,
  returnPath,
}: {
  initialError?: string;
  returnPath: string;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInWithPasswordAction,
    initialError ? { status: "error", message: initialError } : { status: "idle" },
  );

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="volver" value={returnPath} />
      <TextField label="Correo" name="email" type="email" autoComplete="email" />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Ingresar
      </Button>
    </form>
  );
}
