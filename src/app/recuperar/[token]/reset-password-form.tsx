"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { resetPasswordAction, type ResetPasswordState } from "../actions";

export function ResetPasswordForm(props: { token: string; passwordMinLength: number }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    { status: "idle" },
  );

  if (state.status === "done") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="ok">Listo, ya cambiaste tu contraseña.</FormMessage>
        <Link href="/ingresar" className={buttonVariants({ size: "lg", className: "h-11" })}>
          Ingresar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={props.token} />
      <TextField
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={props.passwordMinLength}
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Guardar contraseña
      </Button>
      <Link href="/recuperar" className="text-center text-sm underline underline-offset-4">
        Pedir un link nuevo
      </Link>
    </form>
  );
}
