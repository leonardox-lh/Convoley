"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { CreditState } from "./actions";

/** HU-27 / HU-30: one tap pays the sign-up with a plan date or with balance in favor. */
export function PayWithCreditForm(props: {
  registrationId: string;
  action: (previous: CreditState, formData: FormData) => Promise<CreditState>;
  label: string;
}) {
  const [state, action, pending] = useActionState<CreditState, FormData>(props.action, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="registrationId" value={props.registrationId} />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Un momento…" : props.label}
      </Button>
    </form>
  );
}
