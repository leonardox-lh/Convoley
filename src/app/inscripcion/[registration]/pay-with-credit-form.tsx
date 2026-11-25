"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { payWithCreditAction, type CreditState } from "./actions";

/** HU-27: one tap uses a date of the player's plan and the sign-up is paid. */
export function PayWithCreditForm({ registrationId }: { registrationId: string }) {
  const [state, action, pending] = useActionState<CreditState, FormData>(payWithCreditAction, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Un momento…" : "Usar una fecha de mi plan"}
      </Button>
    </form>
  );
}
