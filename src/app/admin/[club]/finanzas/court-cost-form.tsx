"use client";

import { useActionState } from "react";
import { Field, floatingFieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { setCourtCostAction, type CourtCostState } from "./actions";

export function CourtCostForm(props: { clubSlug: string; eventId: string; defaultValue: string }) {
  const [state, action, pending] = useActionState<CourtCostState, FormData>(setCourtCostAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <div className="flex items-end gap-2">
        <Field label="Costo de cancha (S/)" className="flex-1">
          <input
            name="courtCost"
            inputMode="decimal"
            defaultValue={props.defaultValue}
            placeholder="0.00"
            className={floatingFieldClass}
          />
        </Field>
        <Button type="submit" variant="outline" className="h-11" disabled={pending}>
          Guardar
        </Button>
      </div>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "saved" && <FormMessage tone="ok">Costo guardado.</FormMessage>}
    </form>
  );
}
