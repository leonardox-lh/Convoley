"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { GenderSelect } from "../../../../gender-select";
import { addPlayerAction, type RegistrationActionState } from "./actions";

export function AddPlayerForm(props: { clubSlug: string; eventId: string; isMixed: boolean }) {
  const [state, formAction, pending] = useActionState<RegistrationActionState, FormData>(
    addPlayerAction,
    { status: "idle" },
  );

  return (
    <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <summary className="cursor-pointer font-medium">Agregar jugador</summary>
      <form
        // Remount after each add so the fields clear for the next player.
        key={state.status === "done" ? state.message : "form"}
        onSubmit={submitKeepingValues(formAction)}
        className="mt-4 flex flex-col gap-3"
      >
        <input type="hidden" name="clubSlug" value={props.clubSlug} />
        <input type="hidden" name="eventId" value={props.eventId} />
        <TextField label="Nombre" name="firstName" autoComplete="off" />
        <TextField label="Apellido" name="lastName" autoComplete="off" />
        <TextField
          label="Celular"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder="987654321"
        />
        {props.isMixed && <GenderSelect />}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="markPaid" className="size-5" />
          Ya pagó (pagado manual)
        </label>
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        {state.status === "done" && <FormMessage tone="ok">{state.message}</FormMessage>}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          Agregar
        </Button>
      </form>
    </details>
  );
}
