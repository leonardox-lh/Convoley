"use client";

import { startTransition, type FormEvent } from "react";

export const fieldClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-700 dark:bg-zinc-900";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";

/** Text values of the form fields, as the inputs show them. */
export interface EventFieldValues {
  communityId: string;
  title: string;
  date: string;
  time: string;
  venueName: string;
  mapsUrl: string;
  price: string;
  capacity: string;
  isMixed: boolean;
  rules: string;
}

/**
 * Submitting by hand instead of <form action> keeps the typed values when there is an error;
 * React resets uncontrolled fields after a form action.
 */
export function submitKeepingValues(formAction: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  };
}

export function EventFields(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
  minDate: string;
  minCapacity?: number;
  defaults?: EventFieldValues;
}) {
  const { defaults, minCapacity = 1 } = props;
  return (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <label className={labelClass}>
        Nombre
        <input
          name="title"
          required
          maxLength={80}
          placeholder="Mixto intermedio"
          defaultValue={defaults?.title}
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Nivel
        <select
          name="communityId"
          required
          defaultValue={defaults?.communityId}
          className={fieldClass}
        >
          {props.communities.map((community) => (
            <option key={community.id} value={community.id}>
              {community.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Fecha
          <input
            type="date"
            name="date"
            required
            min={props.minDate}
            defaultValue={defaults?.date}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Hora
          <input
            type="time"
            name="time"
            required
            defaultValue={defaults?.time}
            className={fieldClass}
          />
        </label>
      </div>
      <label className={labelClass}>
        Lugar
        <input
          name="venueName"
          required
          maxLength={120}
          placeholder="Coliseo Manuel Bonilla"
          defaultValue={defaults?.venueName}
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Link de Google Maps (opcional)
        <input
          type="url"
          name="mapsUrl"
          placeholder="https://maps.app.goo.gl/..."
          defaultValue={defaults?.mapsUrl}
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Precio (S/)
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="15"
            defaultValue={defaults?.price}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Cupos
          <input
            type="number"
            name="capacity"
            required
            min={minCapacity}
            step={1}
            inputMode="numeric"
            placeholder="18"
            defaultValue={defaults?.capacity}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isMixed"
          defaultChecked={defaults?.isMixed}
          className="size-5"
        />
        Mixto
      </label>
      <label className={labelClass}>
        Reglas (opcional)
        <textarea
          name="rules"
          rows={3}
          maxLength={500}
          placeholder="Mínimo 2 mujeres por equipo"
          defaultValue={defaults?.rules}
          className={fieldClass}
        />
      </label>
    </>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "ok"; children: string }) {
  const colors =
    tone === "error"
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300";
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm ${colors}`}
    >
      {children}
    </p>
  );
}
