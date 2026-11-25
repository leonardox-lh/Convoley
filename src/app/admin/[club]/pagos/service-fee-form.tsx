"use client";

import { useActionState, useState } from "react";
import { Field, fieldClass, FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { updateServiceFeeAction, type ServiceFeeState } from "./actions";

type Kind = "none" | "fixed" | "percent";

/** HU-22: optional fee players pay on top of the price when they pay by Mercado Pago. */
export function ServiceFeeForm(props: { clubSlug: string; kind: Kind; amount: string }) {
  const [kind, setKind] = useState<Kind>(props.kind);
  const [state, formAction, pending] = useActionState<ServiceFeeState, FormData>(
    updateServiceFeeAction,
    { status: "idle" },
  );

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-3">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <Field
        label="Cargo por servicio (opcional)"
        float="always"
        hint="Para trasladar la comisión de Mercado Pago al jugador. Lo ve antes de pagar. Hasta S/ 50 o 20 %."
      >
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as Kind)}
          className={fieldClass}
        >
          <option value="none">Sin cargo</option>
          <option value="fixed">Monto fijo (S/)</option>
          <option value="percent">Porcentaje del precio (%)</option>
        </select>
      </Field>
      {kind !== "none" && (
        <TextField
          label={kind === "fixed" ? "Monto en soles" : "Porcentaje"}
          name="amount"
          inputMode="decimal"
          placeholder={kind === "fixed" ? "1.50" : "3.5"}
          defaultValue={kind === props.kind ? props.amount : ""}
        />
      )}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cargo"}
      </Button>
    </form>
  );
}
