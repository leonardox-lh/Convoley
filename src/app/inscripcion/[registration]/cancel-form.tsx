"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { cancelOwnRegistrationAction, type CancelState } from "./actions";

/** HU-29: two taps, so nobody frees their seat by accident. */
export function CancelRegistrationForm(props: { registrationId: string; outcome: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<CancelState, FormData>(
    cancelOwnRegistrationAction,
    { status: "idle" },
  );
  if (!confirming) {
    return (
      <Button
        variant="outline"
        className="h-11 border-primary text-primary hover:bg-primary/10 hover:text-primary"
        onClick={() => setConfirming(true)}
      >
        Cancelar mi inscripción
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="registrationId" value={props.registrationId} />
      <p className="text-sm">{props.outcome}</p>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
        {pending ? "Cancelando…" : "Sí, cancelar y liberar mi cupo"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
        No, me quedo
      </Button>
    </form>
  );
}

/** HU-29: this page is the player's only key to pay or cancel; nudge them to keep it. */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href.split("?")[0]);
        setCopied(true);
      }}
    >
      {copied ? "Link copiado" : "Copiar mi link"}
    </Button>
  );
}
