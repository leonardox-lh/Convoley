"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  markPaidManuallyAction,
  removeRegistrationAction,
  type RegistrationActionState,
} from "./actions";

const IDLE: RegistrationActionState = { status: "idle" };

export function RegistrationActions(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
  playerName: string;
  canMarkPaid: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [paidState, markPaid, markingPaid] = useActionState(markPaidManuallyAction, IDLE);
  const [removeState, remove, removing] = useActionState(removeRegistrationAction, IDLE);
  const error = [paidState, removeState].find((state) => state.status === "error");
  const pending = markingPaid || removing;

  const hidden = (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="registrationId" value={props.registrationId} />
    </>
  );

  if (confirming) {
    return (
      <form action={remove} className="flex w-full flex-col gap-2">
        {hidden}
        <p className="text-sm">
          ¿Quitar a {props.playerName}? Su cupo queda libre. Si ya pagó, coordina tú la devolución.
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" className="h-10 flex-1" disabled={pending}>
            Sí, quitar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 flex-1"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            No
          </Button>
        </div>
        {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
      </form>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex gap-2">
        {props.canMarkPaid && (
          <form action={markPaid} className="flex-1">
            {hidden}
            <Button type="submit" variant="outline" className="h-10 w-full" disabled={pending}>
              Marcar pagado manual
            </Button>
          </form>
        )}
        <Button
          type="button"
          variant="ghost"
          className="h-10"
          onClick={() => setConfirming(true)}
          disabled={pending}
          aria-label={`Quitar a ${props.playerName}`}
        >
          Quitar
        </Button>
      </div>
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
    </div>
  );
}
