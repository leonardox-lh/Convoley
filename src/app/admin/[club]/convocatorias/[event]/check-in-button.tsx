"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { checkInAction, type RegistrationActionState } from "./actions";

const IDLE: RegistrationActionState = { status: "idle" };

/** HU-38: "Asistió" / "Deshacer" for one player, in the list and on the QR page. */
export function CheckInButton(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
  checkedIn: boolean;
  size?: "default" | "lg";
}) {
  const [state, action, pending] = useActionState(checkInAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="registrationId" value={props.registrationId} />
      <input type="hidden" name="present" value={props.checkedIn ? "false" : "true"} />
      <Button
        type="submit"
        size={props.size}
        variant={props.checkedIn ? "ghost" : "outline"}
        className={props.size === "lg" ? "h-12" : "h-10"}
        disabled={pending}
      >
        {props.checkedIn ? "Deshacer asistencia" : "Marcar asistencia"}
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
