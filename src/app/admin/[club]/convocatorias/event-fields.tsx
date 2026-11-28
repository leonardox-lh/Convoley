"use client";

import { DatePicker, SelectPicker, TimePicker } from "@/components/date-time-pickers";
import { Field, floatingFieldClass } from "@/components/form";
import { LocationPicker, type SavedVenue } from "@/components/location-picker";
import { useState } from "react";
import { suggestedEndTime } from "./event-time";
import { removeVenueAction } from "./venue-actions";
// Type only: this is a client component and the module index pulls in server code.
import type { EventCategory } from "@/modules/events";
import { EVENT_CATEGORY_LABELS } from "../../../event-category";

export { fieldClass, FormMessage, submitKeepingValues } from "@/components/form";

/** Text values of the form fields, as the inputs show them. */
export interface EventFieldValues {
  communityId: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  venueName: string;
  mapsUrl: string;
  price: string;
  capacity: string;
  category: EventCategory;
  showRoster: boolean;
  rules: string;
}

export function EventFields(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
  minDate: string;
  /** Date preselected on a new event (the edit form uses `defaults.date`). */
  defaultDate?: string;
  savedVenues?: SavedVenue[];
  minCapacity?: number;
  defaults?: EventFieldValues;
  /** HU-28: the recurring form asks for a weekday and time instead (`schedule`). */
  schedule?: React.ReactNode;
}) {
  const { defaults, minCapacity = 1 } = props;
  const [endTime, setEndTime] = useState(defaults?.endTime);
  return (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <Field label="Nombre">
        <input
          name="title"
          required
          maxLength={80}
          placeholder="Mixto intermedio"
          defaultValue={defaults?.title}
          className={floatingFieldClass}
        />
      </Field>
      <SelectPicker
        label="Nivel"
        name="communityId"
        defaultValue={defaults?.communityId}
        options={props.communities.map((community) => ({
          value: community.id,
          label: community.name,
        }))}
      />
      <SelectPicker
        label="Categoría"
        name="category"
        defaultValue={defaults?.category}
        options={Object.entries(EVENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
      />
      {props.schedule ?? (
        <>
          <DatePicker
            label="Fecha"
            name="date"
            min={props.minDate}
            defaultValue={defaults?.date ?? props.defaultDate}
          />
          <div className="grid grid-cols-2 gap-3">
            <TimePicker
              label="Hora de inicio"
              name="time"
              defaultValue={defaults?.time}
              onChange={(start) => setEndTime(suggestedEndTime(start) ?? endTime)}
            />
            {/* Keyed by the suggestion so a new start time refills the end. */}
            <TimePicker key={endTime} label="Hora de fin" name="endTime" defaultValue={endTime} />
          </div>
        </>
      )}
      <LocationPicker
        venueName={defaults?.venueName}
        mapsUrl={defaults?.mapsUrl}
        savedVenues={props.savedVenues}
        onRemoveVenue={(saved) =>
          removeVenueAction({ clubSlug: props.clubSlug, venueId: saved.id })
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio (S/)">
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="15"
            defaultValue={defaults?.price}
            className={floatingFieldClass}
          />
        </Field>
        <Field label="Cupos">
          <input
            type="number"
            name="capacity"
            required
            min={minCapacity}
            step={1}
            inputMode="numeric"
            placeholder="18"
            defaultValue={defaults?.capacity}
            className={floatingFieldClass}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <ToggleField
          name="showRoster"
          title="Lista de inscritos pública"
          text="Cualquiera con el link ve quiénes se van inscribiendo."
          defaultChecked={defaults?.showRoster}
        />
      </div>
      <Field label="Reglas (opcional)">
        <textarea
          name="rules"
          rows={3}
          maxLength={500}
          placeholder="Mínimo 2 mujeres por equipo"
          defaultValue={defaults?.rules}
          className={floatingFieldClass}
        />
      </Field>
    </>
  );
}

/** Checkbox drawn as a switch, with a line saying what it does. */
export function ToggleField(props: {
  name: string;
  title: string;
  text: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 has-checked:border-primary/50 has-checked:bg-secondary/50">
      <span className="flex flex-col">
        <span className="text-sm font-medium">{props.title}</span>
        <span className="text-xs text-muted-foreground">{props.text}</span>
      </span>
      <input
        type="checkbox"
        name={props.name}
        defaultChecked={props.defaultChecked}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}
