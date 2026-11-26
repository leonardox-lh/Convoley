import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RegistrationStatus } from "@/modules/registrations";
import {
  REGISTRATION_STATUS_BADGE_CLASSES,
  REGISTRATION_STATUS_LABELS,
} from "../../../registration-status";
import { PaymentInstructions, type PaymentInfo } from "./payment-instructions";

const STATUS_NOTES: Partial<Record<RegistrationStatus, string>> = {
  in_review: "El organizador está revisando tu pago.",
  paid: "Tu pago está confirmado. ¡Nos vemos en la cancha!",
  waitlisted: "Si se libera un cupo, pasas automáticamente a la lista y te toca pagar.",
};

/** A signed-in player who already signed up sees their sign-up instead of the form again. */
export function MyRegistration(props: {
  registration: { id: string; status: RegistrationStatus; waitlistPosition: number | null };
  paymentInfo: PaymentInfo;
}) {
  const { registration } = props;
  const path = `/inscripcion/${registration.id}`;
  const pendingPayment = registration.status === "pending_payment";
  const note = STATUS_NOTES[registration.status];
  return (
    <section
      aria-labelledby="my-registration-title"
      className="flex flex-col gap-3 rounded-3xl border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="my-registration-title" className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
          Ya estás inscrito
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
          )}
        >
          {REGISTRATION_STATUS_LABELS[registration.status]}
        </span>
      </div>
      {registration.waitlistPosition !== null && (
        <p className="text-sm">
          Tu puesto en la lista de espera:{" "}
          <span className="font-semibold">{registration.waitlistPosition}</span>
        </p>
      )}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {pendingPayment && (
        <>
          <PaymentInstructions info={props.paymentInfo} />
          <Link href={path} className={buttonVariants({ size: "lg", className: "h-11" })}>
            Pagar o subir mi captura
          </Link>
        </>
      )}
      <Link
        href={path}
        className={buttonVariants({
          variant: pendingPayment ? "ghost" : "outline",
          className: "h-10",
        })}
      >
        Ver mi inscripción o cancelar
      </Link>
    </section>
  );
}
