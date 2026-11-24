"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction, type RequestResetState } from "./actions";

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState<RequestResetState, FormData>(
    requestPasswordResetAction,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <FormMessage tone="ok">
        Si ese correo tiene cuenta, te enviamos un link para crear una nueva contraseña. Vence en 1
        hora.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <TextField label="Correo" name="email" type="email" autoComplete="email" />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Enviarme el link
      </Button>
    </form>
  );
}
