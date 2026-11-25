"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction, type AcceptInvitationState } from "./actions";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AcceptInvitationState, FormData>(
    acceptInvitationAction,
    { status: "idle" },
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Aceptar invitación
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
