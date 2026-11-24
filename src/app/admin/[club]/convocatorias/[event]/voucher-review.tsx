"use client";

import { useActionState, useState } from "react";
import { fieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { approveVoucherAction, rejectVoucherAction, type RegistrationActionState } from "./actions";

const IDLE: RegistrationActionState = { status: "idle" };

/** The player's screenshot with one-click approve, or reject with a reason (HU-15). */
export function VoucherReview(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
  playerName: string;
  /** Signed, short-lived path to the private image. */
  imageUrl: string | null;
  securityCode: string | null;
  reasonMaxLength: number;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approve, approving] = useActionState(approveVoucherAction, IDLE);
  const [rejectState, reject, rejectingNow] = useActionState(rejectVoucherAction, IDLE);
  const error = [approveState, rejectState].find((state) => state.status === "error");
  const pending = approving || rejectingNow;

  const hidden = (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="registrationId" value={props.registrationId} />
    </>
  );

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-sky-50 p-3 dark:bg-sky-950/40">
      <div className="flex items-start gap-3">
        {props.imageUrl && (
          <a
            href={props.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver captura ampliada de ${props.playerName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, can't go through next/image */}
            <img
              src={props.imageUrl}
              alt={`Captura de pago de ${props.playerName}`}
              className="h-24 w-16 rounded border border-zinc-200 object-cover dark:border-zinc-800"
            />
          </a>
        )}
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">Captura por revisar</p>
          {props.imageUrl && (
            <a
              href={props.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Ver captura ampliada
            </a>
          )}
          {props.securityCode && <p>Código de seguridad: {props.securityCode}</p>}
        </div>
      </div>

      {rejecting ? (
        <form action={reject} className="flex flex-col gap-2">
          {hidden}
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Motivo del rechazo (lo verá el jugador)
            <input
              name="reason"
              required
              maxLength={props.reasonMaxLength}
              placeholder="El monto no coincide"
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" className="h-10 flex-1" disabled={pending}>
              Rechazar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 flex-1"
              onClick={() => setRejecting(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <form action={approve} className="flex-1">
            {hidden}
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              Aprobar
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1"
            onClick={() => setRejecting(true)}
            disabled={pending}
          >
            Rechazar…
          </Button>
        </div>
      )}
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
    </div>
  );
}
