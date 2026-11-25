"use client";

import { useActionState, useState } from "react";
import { fieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  approveOrderVoucherAction,
  markOrderDeliveredAction,
  rejectOrderVoucherAction,
  type OrderActionState,
} from "./actions";

const IDLE: OrderActionState = { status: "idle" };

/** HU-25: the voucher to approve or reject, or "delivered" once the player picks it up. */
export function OrderActions(props: {
  clubSlug: string;
  orderId: string;
  canDeliver: boolean;
  voucher: { imageUrl: string | null; securityCode: string | null } | null;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approve, approving] = useActionState(approveOrderVoucherAction, IDLE);
  const [rejectState, reject, rejectingNow] = useActionState(rejectOrderVoucherAction, IDLE);
  const [deliverState, deliver, delivering] = useActionState(markOrderDeliveredAction, IDLE);
  const error = [approveState, rejectState, deliverState].find((s) => s.status === "error");
  const pending = approving || rejectingNow || delivering;
  const hidden = (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="orderId" value={props.orderId} />
    </>
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {props.voucher && (
        <div className="flex flex-col gap-2 rounded-lg bg-sky-50 p-3 text-sm dark:bg-sky-950/40">
          <p className="font-medium">Captura por revisar</p>
          {props.voucher.imageUrl && (
            <a
              href={props.voucher.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Ver captura
            </a>
          )}
          {props.voucher.securityCode && <p>Código de seguridad: {props.voucher.securityCode}</p>}
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
        </div>
      )}
      {props.canDeliver && (
        <form action={deliver}>
          {hidden}
          <Button type="submit" variant="outline" className="h-11 w-full" disabled={pending}>
            Marcar como entregado
          </Button>
        </form>
      )}
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
    </div>
  );
}
