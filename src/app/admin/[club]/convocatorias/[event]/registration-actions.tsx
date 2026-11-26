"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markPaidManuallyAction,
  removeRegistrationAction,
  revertToPendingAction,
  type RegistrationActionState,
} from "./actions";

const IDLE: RegistrationActionState = { status: "idle" };

export function RegistrationActions(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
  playerName: string;
  canMarkPaid: boolean;
  canRevertToPending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [paidState, markPaid, markingPaid] = useActionState(markPaidManuallyAction, IDLE);
  const [removeState, remove, removing] = useActionState(removeRegistrationAction, IDLE);
  const [revertState, revert, reverting] = useActionState(revertToPendingAction, IDLE);
  const error = [paidState, removeState, revertState].find((state) => state.status === "error");
  const pending = markingPaid || removing || reverting;

  const hidden = (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="registrationId" value={props.registrationId} />
    </>
  );

  if (confirming) {
    return (
      <form action={remove} className="flex basis-full flex-col gap-2">
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
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {props.canMarkPaid && (
          <form action={markPaid}>
            {hidden}
            <Button
              type="submit"
              variant="outline"
              className="h-9"
              disabled={pending}
              aria-label="Marcar pagado manual"
            >
              Pagado
            </Button>
          </form>
        )}
        {props.canRevertToPending && (
          <form action={revert} className="flex-1">
            {hidden}
            <Button type="submit" variant="outline" className="h-9 w-full" disabled={pending}>
              Volver a pendiente
            </Button>
          </form>
        )}
        <Button
          type="button"
          variant="ghost"
          className="ml-auto h-9 text-destructive hover:text-destructive"
          onClick={() => setConfirming(true)}
          disabled={pending}
          aria-label={`Quitar a ${props.playerName}`}
          title="Quitar"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
      {revertState.status === "done" && <FormMessage tone="ok">{revertState.message}</FormMessage>}
    </div>
  );
}
