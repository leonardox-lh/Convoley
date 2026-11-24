"use client";

import { useActionState, useState, type FormEvent } from "react";
import { fieldClass, FormMessage, submitKeepingValues } from "@/components/form";
import { Button } from "@/components/ui/button";
import { submitVoucherAction, type VoucherState } from "./actions";

const BYTES_PER_MB = 1024 * 1024;

export function VoucherForm(props: { registrationId: string; maxBytes: number }) {
  const [state, formAction, pending] = useActionState<VoucherState, FormData>(submitVoucherAction, {
    status: "idle",
  });
  const [sizeError, setSizeError] = useState<string | null>(null);
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="registrationId" value={props.registrationId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Captura de tu pago
        {/* image/* opens the phone's gallery (and camera) picker. */}
        <input type="file" name="voucher" accept="image/*" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Código de seguridad de Yape (opcional)
        <input
          name="yapeSecurityCode"
          inputMode="numeric"
          autoComplete="off"
          placeholder="123"
          className={fieldClass}
        />
      </label>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Enviar captura"}
      </Button>
    </form>
  );
}
