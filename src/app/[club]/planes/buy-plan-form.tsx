"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { PlayerProfile } from "@/modules/identity";
import { buyPlanAction, type BuyPlanState } from "./actions";

/** HU-27: who buys the plan. The phone (or Google account) is how their credits are found. */
export function BuyPlanForm({
  clubSlug,
  planId,
  profile,
}: {
  clubSlug: string;
  planId: string;
  profile: PlayerProfile | null;
}) {
  const [state, action, pending] = useActionState<BuyPlanState, FormData>(buyPlanAction, {
    status: "idle",
  });
  return (
    <form onSubmit={submitKeepingValues(action)} className="flex flex-col gap-3">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <input type="hidden" name="planId" value={planId} />
      <TextField
        label="Nombre"
        name="firstName"
        autoComplete="given-name"
        defaultValue={profile?.firstName}
      />
      <TextField
        label="Apellido"
        name="lastName"
        autoComplete="family-name"
        defaultValue={profile?.lastName}
      />
      <TextField
        label="Celular (con este número usas tus fechas)"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="987654321"
        defaultValue={profile?.phone?.replace(/^\+51/, "")}
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Un momento…" : "Comprar y pagar"}
      </Button>
    </form>
  );
}
