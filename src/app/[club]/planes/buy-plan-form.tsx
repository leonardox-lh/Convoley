"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { buyPlanAction, type BuyPlanState } from "./actions";

/** HU-27: who buys the plan. The phone (or Google account) is how their credits are found. */
export function BuyPlanForm({ clubSlug, planId }: { clubSlug: string; planId: string }) {
  const [state, action, pending] = useActionState<BuyPlanState, FormData>(buyPlanAction, {
    status: "idle",
  });
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-3">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <input type="hidden" name="planId" value={planId} />
      <TextField label="Nombre" name="firstName" autoComplete="given-name" />
      <TextField label="Apellido" name="lastName" autoComplete="family-name" />
      <TextField
        label="Celular (con este número usas tus fechas)"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="987654321"
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Un momento…" : "Comprar y pagar"}
      </Button>
    </form>
  );
}
