"use client";

import { useActionState } from "react";
import { fieldClass, FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { updatePaymentSettingsAction, type PaymentSettingsState } from "./actions";

export function PaymentSettingsForm(props: {
  clubSlug: string;
  defaults: { paymentPhone: string | null; paymentHolderName: string | null };
  hasQr: boolean;
}) {
  const [state, formAction, pending] = useActionState<PaymentSettingsState, FormData>(
    updatePaymentSettingsAction,
    { status: "idle" },
  );

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <TextField
        label="Número de Yape o Plin"
        name="paymentPhone"
        type="tel"
        inputMode="numeric"
        placeholder="987654321"
        defaultValue={props.defaults.paymentPhone?.replace(/^\+51/, "") ?? ""}
      />
      <TextField
        label="Nombre del titular"
        name="paymentHolderName"
        placeholder="Como aparece en Yape"
        defaultValue={props.defaults.paymentHolderName ?? ""}
      />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {props.hasQr ? "Cambiar imagen del QR (opcional)" : "Imagen del QR (opcional)"}
        <input
          type="file"
          name="qr"
          accept="image/jpeg,image/png,image/webp"
          className={fieldClass}
        />
        <span className="text-xs font-normal text-zinc-500">
          Captura del QR de tu Yape o Plin. JPG, PNG o WebP de hasta 2 MB.
        </span>
      </label>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
