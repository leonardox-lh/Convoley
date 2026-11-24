"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { signUpAction, type SignUpState } from "./actions";

export function SignUpForm({ passwordMinLength }: { passwordMinLength: number }) {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUpAction, {
    status: "idle",
  });

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <TextField label="Tu nombre" name="name" autoComplete="name" />
      <TextField label="Correo" name="email" type="email" autoComplete="email" />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={passwordMinLength}
        aria-describedby="password-hint"
      />
      <p id="password-hint" className="-mt-2 text-xs text-zinc-500">
        Mínimo {passwordMinLength} caracteres.
      </p>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Crear cuenta
      </Button>
    </form>
  );
}
