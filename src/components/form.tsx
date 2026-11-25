import { startTransition, type FormEvent } from "react";
import { Toast } from "./toast";

/** Text input style shared by the forms: 16px text so iOS doesn't zoom on focus. */
export const fieldClass =
  "peer w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 hover:border-primary/40 focus:border-primary focus:ring-3 focus:ring-primary/15";

export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: React.ReactNode;
}) {
  // Success floats as a toast for a few seconds; errors stay next to the form until fixed.
  if (tone === "ok") return <Toast>{children}</Toast>;
  return (
    <p
      role="alert"
      className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
    >
      {children}
    </p>
  );
}

/** Hides the hint while the label sits inside the empty field; it shows again on focus. */
export const floatingFieldClass = `${fieldClass} placeholder:text-transparent focus:placeholder:text-muted-foreground/70`;

const floatingLabelClass =
  "pointer-events-none absolute top-0 left-2.5 -translate-y-1/2 rounded bg-card px-1 text-xs font-medium text-muted-foreground transition-all duration-150 peer-focus:text-primary";
// Empty and unfocused: the label rests inside the field like a placeholder.
const restingLabelClass =
  "peer-[:placeholder-shown:not(:focus)]:top-1/2 peer-[:placeholder-shown:not(:focus)]:text-base peer-[:placeholder-shown:not(:focus)]:font-normal";

/**
 * Outlined field whose label sits inside it and floats onto the border, saving a line per field.
 * The control goes first and must carry `fieldClass` (it has the `peer` class the label reads).
 * `float="always"` for controls that always show a value: selects, pickers, textareas.
 */
export function Field({
  label,
  float = "auto",
  className = "",
  hint,
  children,
}: {
  label: React.ReactNode;
  float?: "auto" | "always";
  className?: string;
  /** Help line under the field. */
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="relative">
        {children}
        <span className={`${floatingLabelClass} ${float === "auto" ? restingLabelClass : ""}`}>{label}</span>
      </span>
      {hint && <span className="px-1 text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Labeled text input for the account forms. */
export function TextField({
  label,
  placeholder = " ",
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label}>
      <input required className={floatingFieldClass} placeholder={placeholder} {...input} />
    </Field>
  );
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
