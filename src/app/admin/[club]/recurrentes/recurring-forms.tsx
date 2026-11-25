"use client";

import { useActionState } from "react";
import { TimePicker } from "@/components/date-time-pickers";
import { Button } from "@/components/ui/button";
import { Field, floatingFieldClass } from "@/components/form";
import {
  EventFields,
  fieldClass,
  FormMessage,
  submitKeepingValues,
} from "../convocatorias/event-fields";
import { WEEKDAY_LABELS } from "./weekdays";
import { createRecurringEventAction, setPausedAction, type RecurringEventState } from "./actions";

const DEFAULT_PUBLISH_DAYS_BEFORE = 6;

export function NewRecurringEventForm(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
  maxPublishDaysBefore: number;
}) {
  const [state, formAction, pending] = useActionState<RecurringEventState, FormData>(
    createRecurringEventAction,
    { status: "idle" },
  );
  const schedule = (
    <>
      <Field label="Día" float="always">
        <select name="weekday" required defaultValue="2" className={fieldClass}>
          {WEEKDAY_LABELS.map((label, weekday) => (
            <option key={label} value={weekday}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <TimePicker label="Hora de inicio" name="time" />
        <TimePicker label="Hora de fin" name="endTime" />
      </div>
      <Field label="Publicar cuántos días antes">
        <input placeholder=" "
          type="number"
          name="publishDaysBefore"
          required
          min={0}
          max={props.maxPublishDaysBefore}
          defaultValue={DEFAULT_PUBLISH_DAYS_BEFORE}
          inputMode="numeric"
          className={floatingFieldClass}
        />
      </Field>
    </>
  );

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <EventFields
        clubSlug={props.clubSlug}
        communities={props.communities}
        minDate=""
        schedule={schedule}
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "created" && (
        <FormMessage tone="ok">Listo: las fechas se publican solas.</FormMessage>
      )}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Crear convocatoria recurrente
      </Button>
    </form>
  );
}

export function PauseForm(props: {
  clubSlug: string;
  recurringEventId: string;
  isPaused: boolean;
}) {
  const [state, action, pending] = useActionState<RecurringEventState, FormData>(setPausedAction, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="recurringEventId" value={props.recurringEventId} />
      <input type="hidden" name="isPaused" value={String(!props.isPaused)} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {props.isPaused ? "Reanudar" : "Pausar"}
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
