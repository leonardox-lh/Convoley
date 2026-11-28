"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./form";

const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Dates as "YYYY-MM-DD" strings, built in UTC so the user's time zone never shifts a day. */
const toIso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const longDate = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthTitle = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !ref.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// Same look as the floated label of `Field`.
const pickerLabelClass =
  "pointer-events-none absolute top-0 left-2.5 -translate-y-1/2 rounded bg-card px-1 text-xs font-medium text-muted-foreground peer-focus:text-primary";

const panelClass =
  "absolute top-full left-0 z-20 mt-2 w-72 rounded-2xl border bg-card p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150";

// Keeps the browser's "required" check: an invisible input that holds the chosen value.
function RequiredValue({
  name,
  value,
  required = true,
}: {
  name: string;
  value: string;
  required?: boolean;
}) {
  return (
    <input
      name={name}
      value={value}
      required={required}
      onChange={() => undefined}
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
    />
  );
}

export function DatePicker(props: {
  label: string;
  name: string;
  defaultValue?: string;
  min?: string;
}) {
  const { open, setOpen, ref } = usePopover();
  const id = useId();
  const [value, setValue] = useState(props.defaultValue ?? "");
  const start = value || props.min || new Date().toISOString().slice(0, 10);
  const [view, setView] = useState(() => ({
    year: Number(start.slice(0, 4)),
    month: Number(start.slice(5, 7)) - 1,
  }));

  const firstWeekday = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const shiftMonth = (delta: number) =>
    setView(({ year, month }) => {
      const date = new Date(Date.UTC(year, month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
        className={cn(
          fieldClass,
          "flex items-center gap-2 text-left",
          !value && "text-muted-foreground/70",
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
        <span id={`${id}-value`} className="truncate first-letter:uppercase">
          {value ? longDate.format(new Date(`${value}T12:00:00Z`)) : "Elige la fecha"}
        </span>
      </button>
      <span id={`${id}-label`} className={pickerLabelClass}>
        {props.label}
      </span>
      <RequiredValue name={props.name} value={value} />
      {open && (
        <div role="dialog" aria-label={props.label} className={panelClass}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-full p-1.5 hover:bg-secondary"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-semibold first-letter:uppercase">
              {monthTitle.format(new Date(Date.UTC(view.year, view.month, 1)))}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-full p-1.5 hover:bg-secondary"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 uppercase">
                {day}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const iso = toIso(view.year, view.month, i + 1);
              const disabled = Boolean(props.min && iso < props.min);
              const selected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  aria-label={longDate.format(new Date(`${iso}T12:00:00Z`))}
                  disabled={disabled}
                  onClick={() => {
                    setValue(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "aspect-square rounded-full text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-30",
                    selected && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Clock face: 12 positions around the dial, for hours (12, 1…11) and for minutes (00, 05…55).
const HOUR_FACE = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_FACE = Array.from({ length: 12 }, (_, i) => i * 5);
const FACE_PX = 240;
const RADIUS_PX = 92;
const DEFAULT_HOUR = 19; // most games start in the evening
const DEGREES_PER_POSITION = 30;

const facePosition = (index: number) => {
  const angle = (index / 12) * 2 * Math.PI;
  return {
    left: FACE_PX / 2 + RADIUS_PX * Math.sin(angle),
    top: FACE_PX / 2 - RADIUS_PX * Math.cos(angle),
  };
};
const toHour12 = (hour: number) => hour % 12 || 12;
const timeText = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return `${toHour12(hour)}:${pad(minute)} ${hour < 12 ? "a. m." : "p. m."}`;
};

/** Time chosen on a clock face in a modal: hour first, then minutes, with a.m./p.m. */
export function TimePicker(props: {
  label: string;
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(props.defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"hour" | "minute">("hour");
  const [draft, setDraft] = useState({ hour: DEFAULT_HOUR, minute: 0 });

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const openClock = () => {
    const [hour, minute] = value ? value.split(":").map(Number) : [DEFAULT_HOUR, 0];
    setDraft({ hour, minute });
    setStep("hour");
    setOpen(true);
  };
  const isPm = draft.hour >= 12;
  const setPm = (pm: boolean) =>
    setDraft(({ hour, minute }) => ({ hour: (hour % 12) + (pm ? 12 : 0), minute }));
  const selectedIndex = step === "hour" ? draft.hour % 12 : Math.round(draft.minute / 5) % 12;
  const segmentClass = (active: boolean) =>
    cn(
      "rounded-xl px-2 transition-colors",
      active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary/60",
    );

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={openClock}
        className={cn(
          fieldClass,
          "flex items-center gap-2 text-left",
          !value && "text-muted-foreground/70",
        )}
      >
        <Clock className="size-4 shrink-0 text-primary" aria-hidden />
        <span id={`${id}-value`}>{value ? timeText(value) : "Elige la hora"}</span>
      </button>
      <span id={`${id}-label`} className={pickerLabelClass}>
        {props.label}
      </span>
      <RequiredValue name={props.name} value={value} />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 animate-in fade-in duration-150 sm:items-center"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={props.label}
            className="w-full max-w-xs rounded-3xl bg-card p-5 shadow-xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-200"
          >
            <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
            <div className="mt-2 flex items-center justify-center gap-1 text-5xl font-semibold tabular-nums">
              <button
                type="button"
                onClick={() => setStep("hour")}
                className={segmentClass(step === "hour")}
              >
                {toHour12(draft.hour)}
              </button>
              <span className="text-muted-foreground">:</span>
              <button
                type="button"
                onClick={() => setStep("minute")}
                className={segmentClass(step === "minute")}
              >
                {pad(draft.minute)}
              </button>
              <span className="ml-2 flex flex-col gap-1 text-sm font-medium">
                <button type="button" onClick={() => setPm(false)} className={segmentClass(!isPm)}>
                  a. m.
                </button>
                <button type="button" onClick={() => setPm(true)} className={segmentClass(isPm)}>
                  p. m.
                </button>
              </span>
            </div>
            <div
              className="relative mx-auto mt-5 rounded-full bg-secondary"
              style={{ width: FACE_PX, height: FACE_PX }}
            >
              <span
                aria-hidden
                className="absolute top-1/2 left-1/2 w-0.5 origin-bottom bg-primary transition-transform duration-200"
                style={{
                  height: RADIUS_PX,
                  transform: `translate(-50%, -100%) rotate(${selectedIndex * DEGREES_PER_POSITION}deg)`,
                }}
              />
              <span
                aria-hidden
                className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-primary"
              />
              {(step === "hour" ? HOUR_FACE : MINUTE_FACE).map((number, index) => (
                <button
                  key={number}
                  type="button"
                  aria-label={step === "hour" ? `${number} horas` : `${number} minutos`}
                  onClick={() => {
                    if (step === "minute")
                      return setDraft((current) => ({ ...current, minute: number }));
                    setDraft((current) => ({ ...current, hour: (number % 12) + (isPm ? 12 : 0) }));
                    setStep("minute");
                  }}
                  className={cn(
                    "absolute flex size-10 -translate-1/2 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    index === selectedIndex
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-card",
                  )}
                  style={facePosition(index)}
                >
                  {step === "hour" ? number : pad(number)}
                </button>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 flex-1 rounded-xl border text-sm font-medium transition-colors hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const time = `${pad(draft.hour)}:${pad(draft.minute)}`;
                  setValue(time);
                  props.onChange?.(time);
                  setOpen(false);
                }}
                className="h-11 flex-1 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A list choice in the same popover style as the date picker (the native <select> can't be styled). */
export function SelectPicker(props: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  /** False for an optional choice, e.g. one whose first option is "—". */
  required?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const { open, setOpen, ref } = usePopover();
  const id = useId();
  const [value, setValue] = useState(props.defaultValue ?? props.options[0]?.value ?? "");
  const selected = props.options.find((option) => option.value === value);

  return (
    <div ref={ref} className={cn("relative", props.className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
        className={cn(
          fieldClass,
          "flex items-center gap-2 text-left",
          !selected && "text-muted-foreground/70",
        )}
      >
        <span id={`${id}-value`} className="flex-1 truncate">
          {selected?.label ?? "Elige una opción"}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-primary transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <span id={`${id}-label`} className={pickerLabelClass}>
        {props.label}
      </span>
      <RequiredValue name={props.name} value={value} required={props.required} />
      {open && (
        <ul
          role="listbox"
          aria-label={props.label}
          className={cn(panelClass, "w-full min-w-48 p-1.5")}
        >
          {props.options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(option.value);
                    setOpen(false);
                    props.onChange?.(option.value);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-secondary",
                    isSelected && "bg-secondary text-primary",
                  )}
                >
                  {option.label}
                  {isSelected && <Check className="size-4" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
