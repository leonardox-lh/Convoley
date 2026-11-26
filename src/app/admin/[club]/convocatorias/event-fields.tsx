"use client";

import { DatePicker, SelectPicker, TimePicker } from "@/components/date-time-pickers";
import { Field, floatingFieldClass } from "@/components/form";
import { LocationPicker } from "@/components/location-picker";

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
  isMixed: boolean;
  showRoster: boolean;
  rules: string;
}

export function EventFields(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
  minDate: string;
  minCapacity?: number;
  defaults?: EventFieldValues;
  /** HU-28: the recurring form asks for a weekday and time instead (`schedule`). */
  schedule?: React.ReactNode;
}) {
  const { defaults, minCapacity = 1 } = props;
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
        options={props.communities.map((community) => ({ value: community.id, label: community.name }))}
      />
      {props.schedule ?? (
        <>
          <DatePicker label="Fecha" name="date" min={props.minDate} defaultValue={defaults?.date} />
          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Hora de inicio" name="time" defaultValue={defaults?.time} />
            <TimePicker label="Hora de fin" name="endTime" defaultValue={defaults?.endTime} />
          </div>
        </>
      )}
      <LocationPicker venueName={defaults?.venueName} mapsUrl={defaults?.mapsUrl} />
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
          name="isMixed"
          title="Mixto"
          text="Juegan hombres y mujeres en el mismo equipo."
          defaultChecked={defaults?.isMixed}
        />
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
