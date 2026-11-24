"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, submitKeepingValues } from "../../event-fields";
import { cancelEventAction, type CancelEventState } from "./actions";

export function CancelEventForm(props: { clubSlug: string; eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<CancelEventState, FormData>(
    cancelEventAction,
    { status: "idle" },
  );

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="h-11 w-full"
        onClick={() => setConfirming(true)}
      >
        Cancelar convocatoria
      </Button>
    );
  }

  return (
    <form
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-col gap-3 rounded-lg border border-red-200 p-4 dark:border-red-900"
    >
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">¿Qué pasa con los que ya pagaron?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="outcome" value="refund" required className="mt-0.5 size-5" />
          Les devuelvo el dinero
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="outcome" value="balance" required className="mt-0.5 size-5" />
          Queda como saldo a favor para otra convocatoria
        </label>
      </fieldset>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Los inscritos verán el aviso en el link de la convocatoria. Convoley no mueve el dinero: la
        devolución la haces tú desde tu cuenta de Mercado Pago.
      </p>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" variant="destructive" size="lg" className="h-11" disabled={pending}>
        Sí, cancelar convocatoria
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="h-11"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        No, volver
      </Button>
    </form>
  );
}
