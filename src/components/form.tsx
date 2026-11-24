import { startTransition, type FormEvent } from "react";

/** Text input style shared by the forms: 16px text so iOS doesn't zoom on focus. */
export const fieldClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-700 dark:bg-zinc-900";

export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: React.ReactNode;
}) {
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

/** Labeled text input for the account forms. */
export function TextField({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input required className={fieldClass} {...input} />
    </label>
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
