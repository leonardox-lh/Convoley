"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { updateCancellationPolicyAction, type CancellationPolicyState } from "./actions";

/** HU-30: the club's cancellation policy with balance in favor. */
export function CancellationPolicyForm(props: { clubSlug: string; deadlineHours: number | null }) {
  const [state, formAction, pending] = useActionState<CancellationPolicyState, FormData>(
    updateCancellationPolicyAction,
    { status: "idle" },
  );
  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-3">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <h2 className="text-lg font-semibold">Política de cancelación</h2>
      <TextField
        label="Horas límite para cancelar con saldo a favor"
        name="deadlineHours"
        type="number"
        min={0}
        max={168}
        inputMode="numeric"
        required={false}
        placeholder="Sin política"
        defaultValue={props.deadlineHours ?? ""}
      />
      <p className="-mt-2 text-xs text-zinc-500">
        Si el jugador cancela antes de ese límite, lo que pagó queda como saldo a favor para su
        próxima fecha en tu club. Después, lo pierde. Vacío: cancelar algo pagado lo pierde.
      </p>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar política"}
      </Button>
    </form>
  );
}
