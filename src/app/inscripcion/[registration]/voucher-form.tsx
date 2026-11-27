"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Field, floatingFieldClass, FormMessage, submitKeepingValues } from "@/components/form";
import { FileField } from "@/components/file-field";
import { Button } from "@/components/ui/button";
import type { VoucherState } from "./actions";

const BYTES_PER_MB = 1024 * 1024;

/** The voucher upload; the action and hidden fields say what it pays for (HU-14, HU-24). */
export function VoucherForm(props: {
  action: (state: VoucherState, formData: FormData) => Promise<VoucherState>;
  hidden: Record<string, string>;
  maxBytes: number;
  /** Once a screenshot is chosen, room for a message to the organizer, up to this length. */
  noteMaxLength?: number;
}) {
  const [state, formAction, pending] = useActionState<VoucherState, FormData>(props.action, {
    status: "idle",
  });
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const submit = submitKeepingValues(formAction);

  // Checked here too so a big photo fails fast instead of hitting the upload limit.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const file = new FormData(event.currentTarget).get("voucher");
    if (file instanceof File && file.size > props.maxBytes) {
      event.preventDefault();
      setSizeError(`La imagen debe pesar hasta ${props.maxBytes / BYTES_PER_MB} MB.`);
      return;
    }
    setSizeError(null);
    submit(event);
  }

  const error = sizeError ?? (state.status === "error" ? state.message : null);
  return (
    <form
      onSubmit={onSubmit}
      // The file field's change bubbles up here: the message box shows once a screenshot is in.
      onChange={(event) => {
        const input = event.target;
        if (input instanceof HTMLInputElement && input.name === "voucher")
          setHasFile((input.files?.length ?? 0) > 0);
      }}
      className="flex flex-col gap-3"
    >
      {Object.entries(props.hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/* image/* opens the phone's gallery (and camera) picker. */}
      <FileField label="Captura de tu pago" name="voucher" accept="image/*" required />
      {props.noteMaxLength && hasFile && (
        <Field
          label="Mensaje para el organizador (opcional)"
          hint="Ej.: el nombre de tu Yape o si pagas por 2."
        >
          <textarea
            name="payerNote"
            rows={2}
            maxLength={props.noteMaxLength}
            placeholder=" "
            className={floatingFieldClass}
          />
        </Field>
      )}
      <Field label="Código de seguridad de Yape (opcional)">
        <input
          name="yapeSecurityCode"
          inputMode="numeric"
          autoComplete="off"
          placeholder="123"
          className={floatingFieldClass}
        />
      </Field>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Enviar captura"}
      </Button>
    </form>
  );
}
