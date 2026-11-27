"use client";

import { useActionState, useState } from "react";
import { fieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  approvePlanVoucherAction,
  rejectPlanVoucherAction,
  type PurchaseActionState,
} from "./purchase-actions";

const IDLE: PurchaseActionState = { status: "idle" };

/** HU-27: approve the plan's voucher (its dates start counting) or reject it with a reason. */
export function PlanVoucherReview(props: {
  clubSlug: string;
  purchaseId: string;
  imageUrl: string | null;
  securityCode: string | null;
  /** What the player wrote with the screenshot: their Yape name, "pago por 2"… */
  note: string | null;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approve, approving] = useActionState(approvePlanVoucherAction, IDLE);
  const [rejectState, reject, rejectingNow] = useActionState(rejectPlanVoucherAction, IDLE);
  const error = [approveState, rejectState].find((s) => s.status === "error");
  const pending = approving || rejectingNow;
  const hidden = (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="purchaseId" value={props.purchaseId} />
    </>
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-sky-50 p-3 text-sm dark:bg-sky-950/40">
      <p className="font-medium">Captura por revisar</p>
      {props.imageUrl && (
        <a
          href={props.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Ver captura
        </a>
      )}
      {props.securityCode && <p>Código de seguridad: {props.securityCode}</p>}
      {props.note && (
        <p className="rounded-md bg-white px-2 py-1 italic break-words dark:bg-zinc-900">
          “{props.note}”
        </p>
      )}
      {rejecting ? (
        <form action={reject} className="flex flex-col gap-2">
          {hidden}
          <input
            name="reason"
            required
            aria-label="Motivo del rechazo"
            placeholder="El monto no coincide"
            className={fieldClass}
          />
          <Button type="submit" variant="outline" className="h-11" disabled={pending}>
            Rechazar captura
          </Button>
        </form>
      ) : (
        <div className="flex gap-2">
          <form action={approve} className="flex-1">
            {hidden}
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              Aprobar pago
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setRejecting(true)}
          >
            Rechazar
          </Button>
        </div>
      )}
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
    </div>
  );
}
