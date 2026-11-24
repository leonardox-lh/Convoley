import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { formatInLima } from "@/lib/lima-time";
import { cn } from "@/lib/utils";
import { listEventSummaries } from "@/modules/events";
import { findLastVoucherRejection, MAX_VOUCHER_BYTES } from "@/modules/payments";
import { findRegistrationOverview } from "@/modules/registrations";
import { PaymentInstructions } from "../../c/[club]/[event]/payment-instructions";
import { loadPaymentInfo } from "../../payment-info";
import {
  REGISTRATION_STATUS_BADGE_CLASSES,
  REGISTRATION_STATUS_LABELS,
} from "../../registration-status";
import { VoucherForm } from "./voucher-form";

// A private link: keep it out of search engines and link previews' indexes.
export const metadata: Metadata = {
  title: "Mi inscripción · Convoley",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/inscripcion/[registration]">;

/** The player's own sign-up (HU-14): status, waitlist place, how to pay and the voucher upload. */
export default function RegistrationPage(props: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <RegistrationContent {...props} />
      </Suspense>
    </main>
  );
}

async function RegistrationContent({ params, searchParams }: Props) {
  const registration = await findRegistrationOverview((await params).registration);
  if (!registration) notFound();
  const [event] = await listEventSummaries([registration.eventId]);
  if (!event) notFound();
  const { enviado } = await searchParams;
  const awaitingPayment = registration.status === "pending_payment" && event.status !== "cancelled";

  return (
    <>
      <div>
        <p className="text-sm text-zinc-500">{event.clubName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          <Link href={`/c/${event.clubSlug}/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h1>
        <p className="text-sm text-zinc-500 first-letter:uppercase">
          {formatInLima(event.startsAt)}
        </p>
      </div>
      <p className="text-sm">
        {registration.firstName} {registration.lastName} ·{" "}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
          )}
        >
          {REGISTRATION_STATUS_LABELS[registration.status]}
        </span>
      </p>
      {enviado && (
        <FormMessage tone="ok">
          ¡Recibimos tu captura! El organizador la revisará pronto.
        </FormMessage>
      )}
      {registration.waitlistPosition !== null && (
        <p className="text-sm">
          Estás en el puesto <span className="font-semibold">{registration.waitlistPosition}</span>{" "}
          de la lista de espera. Si se libera un cupo, pasas automáticamente y te toca pagar.
        </p>
      )}
      {registration.status === "in_review" && (
        <p className="text-sm text-zinc-500">El organizador está revisando tu pago.</p>
      )}
      {awaitingPayment && (
        <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Paga y sube tu captura</h2>
          <RejectionNotice registrationId={registration.id} />
          <PaymentInstructions info={await loadPaymentInfo(event.clubSlug, event.priceCents)} />
          <VoucherForm registrationId={registration.id} maxBytes={MAX_VOUCHER_BYTES} />
        </section>
      )}
    </>
  );
}

/** After a rejection the player is back to "pending payment": tell them why (HU-15). */
async function RejectionNotice({ registrationId }: { registrationId: string }) {
  const reason = await findLastVoucherRejection(registrationId);
  if (!reason) return null;
  return <FormMessage tone="error">{`Tu captura anterior fue rechazada: ${reason}`}</FormMessage>;
}
