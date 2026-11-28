"use client";

import { useActionState } from "react";
import { SelectPicker } from "@/components/date-time-pickers";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { FileField } from "@/components/file-field";
import { Button } from "@/components/ui/button";
// Type only: this is a client component and the module index pulls in server code.
import type { PaymentApp } from "@/modules/clubs";
import { PAYMENT_APP_LABELS } from "../../../c/[club]/[event]/payment-instructions";
import { updatePaymentSettingsAction, type PaymentSettingsState } from "./actions";

export function PaymentSettingsForm(props: {
  clubSlug: string;
  defaults: {
    paymentApp: PaymentApp | null;
    paymentPhone: string | null;
    paymentHolderName: string | null;
  };
  /** The saved QR, shown inside its field until another image is chosen. */
  qrUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState<PaymentSettingsState, FormData>(
    updatePaymentSettingsAction,
    { status: "idle" },
  );

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <SelectPicker
        label="Cobras con"
        name="paymentApp"
        defaultValue={props.defaults.paymentApp ?? "yape"}
        options={Object.entries(PAYMENT_APP_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <TextField
        label="Número de celular"
        name="paymentPhone"
        type="tel"
        inputMode="numeric"
        placeholder="987654321"
        defaultValue={props.defaults.paymentPhone?.replace(/^\+51/, "") ?? ""}
      />
      <TextField
        label="Nombre del titular"
        name="paymentHolderName"
        placeholder="Como aparece en tu Yape o Plin"
        defaultValue={props.defaults.paymentHolderName ?? ""}
      />
      <FileField
        label="Imagen del QR (opcional)"
        currentImage={props.qrUrl}
        name="qr"
        accept="image/jpeg,image/png,image/webp"
        hint="Captura del QR de tu Yape o Plin. JPG, PNG o WebP de hasta 2 MB."
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
