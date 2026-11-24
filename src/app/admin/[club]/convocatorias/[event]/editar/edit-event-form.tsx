"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/modules/events";
import {
  EventFields,
  FormMessage,
  submitKeepingValues,
  type EventFieldValues,
} from "../../event-fields";
import { updateEventAction, type UpdateEventState } from "./actions";

export function EditEventForm(props: {
  clubSlug: string;
  eventId: string;
  eventStatus: EventStatus;
  communities: { id: string; name: string }[];
  minDate: string;
  confirmedCount: number;
  defaults: EventFieldValues;
}) {
  const [state, formAction, pending] = useActionState<UpdateEventState, FormData>(
    updateEventAction,
    { status: "idle" },
  );
  const eventStatus = state.status === "saved" ? state.eventStatus : props.eventStatus;

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={props.eventId} />
      <EventFields
        clubSlug={props.clubSlug}
        communities={props.communities}
        minDate={props.minDate}
        minCapacity={Math.max(1, props.confirmedCount)}
        defaults={props.defaults}
      />
      {props.confirmedCount > 0 && (
        <p className="-mt-2 text-sm text-zinc-500">
          Hay {props.confirmedCount} inscritos: no puedes dejar menos cupos.
        </p>
      )}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "saved" && (
        <FormMessage tone="ok">
          {state.eventStatus === "full"
            ? "Cambios guardados. La convocatoria quedó llena."
            : "Cambios guardados."}
        </FormMessage>
      )}
      <div className="flex flex-col gap-2">
        {eventStatus === "draft" && (
          <Button
            type="submit"
            name="intent"
            value="publish"
            size="lg"
            className="h-11"
            disabled={pending}
          >
            Guardar y publicar
          </Button>
        )}
        <Button
          type="submit"
          name="intent"
          value="save"
          variant={eventStatus === "draft" ? "outline" : "default"}
          size="lg"
          className="h-11"
          disabled={pending}
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
