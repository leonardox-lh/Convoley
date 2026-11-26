"use client";

import { ChevronDown, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { GenderSelect } from "../../../../gender-select";
import { ToggleField } from "../event-fields";
import { addPlayerAction, type RegistrationActionState } from "./actions";

export function AddPlayerForm(props: { clubSlug: string; eventId: string; isMixed: boolean }) {
  const [state, formAction, pending] = useActionState<RegistrationActionState, FormData>(
    addPlayerAction,
    { status: "idle" },
  );

  return (
    <details className="group rounded-2xl border bg-card p-4 shadow-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
        <UserPlus className="size-4 text-primary" aria-hidden />
        Agregar jugador
        <ChevronDown
          className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <form
        // Remount after each add so the fields clear for the next player.
        key={state.status === "done" ? state.message : "form"}
        onSubmit={submitKeepingValues(formAction)}
        className="mt-4 flex flex-col gap-3"
      >
        <input type="hidden" name="clubSlug" value={props.clubSlug} />
        <input type="hidden" name="eventId" value={props.eventId} />
        <TextField label="Nombre" name="firstName" autoComplete="off" />
        <TextField
          label="Apellido (opcional)"
          required={false}
          name="lastName"
          autoComplete="off"
        />
        <TextField
          label="Celular (opcional)"
          required={false}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder="987654321"
        />
        {props.isMixed && <GenderSelect />}
        <ToggleField
          name="markPaid"
          title="Pago manual"
          text="Ya te pagó en efectivo o por transferencia."
        />
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        {state.status === "done" && <FormMessage tone="ok">{state.message}</FormMessage>}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          Agregar
        </Button>
      </form>
    </details>
  );
}
