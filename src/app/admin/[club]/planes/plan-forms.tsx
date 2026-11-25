"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { createPlanAction, togglePlanAction, type PlanActionState } from "./actions";

const IDLE: PlanActionState = { status: "idle" };

/** HU-26: number of dates and/or validity in days, price and the communities it covers. */
export function NewPlanForm(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createPlanAction, IDLE);
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-4">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <TextField label="Nombre" name="name" placeholder="4 fechas, Mensualidad…" />
      <TextField label="Precio (S/)" name="price" inputMode="decimal" placeholder="50.00" />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Número de fechas"
          name="creditCount"
          inputMode="numeric"
          required={false}
          placeholder="4"
        />
        <TextField
          label="Vigencia (días)"
          name="validityDays"
          inputMode="numeric"
          required={false}
          placeholder="30"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Llena uno o ambos. Sin número de fechas, el jugador juega todas las que quiera mientras esté
        vigente (mensualidad). La vigencia cuenta desde que paga.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Vale para</legend>
        {props.communities.map((community) => (
          <label key={community.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="communityIds" value={community.id} className="size-5" />
            {community.name}
          </label>
        ))}
      </fieldset>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "created" && <FormMessage tone="ok">Plan creado.</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Crear plan
      </Button>
    </form>
  );
}

export function TogglePlanForm(props: { clubSlug: string; planId: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(togglePlanAction, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="planId" value={props.planId} />
      <input type="hidden" name="isActive" value={String(!props.isActive)} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {props.isActive ? "Dejar de ofrecer" : "Volver a ofrecer"}
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
