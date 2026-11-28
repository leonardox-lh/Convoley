import type { Metadata } from "next";
import { PageHeading, PageHeadingLoading } from "@/components/page-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { formatTimeInLima, formatTimeRangeInLima, formatWeekdayDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { listEventSummaries } from "@/modules/events";
import { clubLogoPath, findClubBySlug, getClubProfile, serviceFeeFor } from "@/modules/clubs";
import { ClubLogo } from "@/components/club-logo";
import { currentUserId, isGoogleSignInEnabled } from "@/modules/identity";
import { Button } from "@/components/ui/button";
import {
  findLastVoucherRejection,
  getMercadoPagoStatus,
  isMercadoPagoConfigured,
  MAX_VOUCHER_BYTES,
} from "@/modules/payments";
import { getBalance, getCreditBalance } from "@/modules/plans";
import {
  CancellationNotAllowedError,
  type CancellationResult,
  findRegistrationOverview,
  getEditableOwnDetails,
  getCancellationPreview,
} from "@/modules/registrations";
import { PaymentInstructions } from "../../c/[club]/[event]/payment-instructions";
import { loadPaymentInfo } from "../../payment-info";
import {
  REGISTRATION_STATUS_BADGE_CLASSES,
  REGISTRATION_STATUS_LABELS,
} from "../../registration-status";
import {
  payWithBalanceAction,
  payWithCreditAction,
  payWithMercadoPagoAction,
  signInToUseFundsAction,
  submitVoucherAction,
} from "./actions";
import { CancelRegistrationForm, CopyLinkButton } from "./cancel-form";
import { CheckInQr } from "./check-in-qr";
import { PAYER_NOTE_MAX_LENGTH } from "./payer-note";
import { EditDetailsButton } from "./edit-details";
import { PayWithCreditForm } from "./pay-with-credit-form";
import { MercadoPagoCheckout } from "./mercado-pago-checkout";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8">
      <Suspense fallback={<PageHeadingLoading />}>
        <RegistrationContent {...props} />
      </Suspense>
    </main>
  );
}

async function RegistrationContent({ params, searchParams }: Props) {
  const registration = await findRegistrationOverview((await params).registration);
  if (!registration) notFound();
  const [[event], editableDetails] = await Promise.all([
    listEventSummaries([registration.eventId]),
    getEditableOwnDetails(registration.id),
  ]);
  if (!event) notFound();
  const { enviado, pagado } = await searchParams;
  // HU-21: an ended reservation no longer holds the seat, even before a sign-up releases it.
  const reservationEnded =
    registration.status === "pending_payment" &&
    registration.reservedUntil !== null &&
    registration.reservedUntil <= new Date();
  const awaitingPayment =
    registration.status === "pending_payment" && event.status !== "cancelled" && !reservationEnded;
  const mercadoPago = awaitingPayment
    ? await mercadoPagoCheckout(event.clubSlug, event.priceCents)
    : null;
  // HU-27/HU-30: plan and balance belong to a Google account, so only that signed-in account
  // sees and spends them; guests and other sessions don't.
  const ownerId =
    registration.userId !== null && registration.userId === (await currentUserId())
      ? registration.userId
      : null;
  const credits =
    awaitingPayment && ownerId
      ? await getCreditBalance({ player: { clubId: event.clubId, userId: ownerId }, event })
      : 0;
  // HU-30: balance kept from a cancellation pays only the whole price.
  const balanceCents =
    awaitingPayment && ownerId && event.priceCents > 0
      ? await getBalance({ clubId: event.clubId, userId: ownerId })
      : 0;
  const club = await getClubProfile(event.clubSlug);
  const canSignInForFunds =
    awaitingPayment && registration.userId !== null && !ownerId && isGoogleSignInEnabled;

  return (
    <>
      <PageHeading
        eyebrow={event.clubName}
        primaryColor={club?.primaryColor ?? null}
        media={
          <ClubLogo
            name={event.clubName}
            src={club?.logoKey ? clubLogoPath(club.logoKey) : null}
            className="size-11 rounded-xl"
          />
        }
        title={
          <Link href={`/c/${event.clubSlug}/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        }
      >
        <span className="flex flex-col">
          <span>{formatWeekdayDateInLima(event.startsAt)}</span>
          <span>{formatTimeRangeInLima(event)}</span>
        </span>
      </PageHeading>
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
      {registration.status !== "cancelled" && (
        <div className="flex items-center justify-between gap-3 text-sm text-zinc-500">
          <span>Guarda este link: con él pagas o cancelas.</span>
          <CopyLinkButton />
        </div>
      )}
      {pagado && registration.status === "paid" && (
        <FormMessage tone="ok">¡Pago confirmado! Ya estás en la lista.</FormMessage>
      )}
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
      {reservationEnded && (
        <FormMessage tone="error">
          Se venció tu reserva de 10 minutos y el cupo se liberó.{" "}
          <Link href={`/c/${event.clubSlug}/${event.id}`} className="underline">
            Vuelve a inscribirte
          </Link>{" "}
          si aún hay cupo.
        </FormMessage>
      )}
      {registration.status === "in_review" && (
        <p className="text-sm text-zinc-500">El organizador está revisando tu pago.</p>
      )}
      {editableDetails && (
        <EditDetailsButton
          registrationId={registration.id}
          details={editableDetails}
          isMixed={event.category === "mixed"}
        />
      )}
      {registration.status !== "waitlisted" &&
        registration.status !== "cancelled" &&
        !reservationEnded &&
        event.status !== "cancelled" && (
          <CheckInQr
            clubSlug={event.clubSlug}
            eventId={event.id}
            registrationId={registration.id}
          />
        )}
      {canSignInForFunds && (
        <form action={signInToUseFundsAction} className="flex flex-col gap-2 text-sm">
          <input type="hidden" name="registrationId" value={registration.id} />
          <p className="text-zinc-500">
            ¿Tienes un plan o saldo a favor? Entra con Google para usarlo.
          </p>
          <Button type="submit" variant="outline">
            Entrar con Google
          </Button>
        </form>
      )}
      {credits !== 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-emerald-200 p-4 dark:border-emerald-900">
          <p className="text-sm">
            {credits === null
              ? "Tu plan te da fechas ilimitadas."
              : `Tienes ${credits} ${credits === 1 ? "fecha" : "fechas"} de tu plan.`}
          </p>
          <PayWithCreditForm
            registrationId={registration.id}
            action={payWithCreditAction}
            label="Usar una fecha de mi plan"
          />
        </section>
      )}
      {balanceCents >= event.priceCents && balanceCents > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-emerald-200 p-4 dark:border-emerald-900">
          <p className="text-sm">
            Tienes {formatSoles(balanceCents)} de saldo a favor en este club.
          </p>
          <PayWithCreditForm
            registrationId={registration.id}
            action={payWithBalanceAction}
            label={`Pagar ${formatSoles(event.priceCents)} con mi saldo`}
          />
        </section>
      )}
      {awaitingPayment && mercadoPago && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Paga con Yape o tarjeta</h2>
          {registration.reservedUntil && (
            <p className="text-sm">
              Tu cupo está reservado hasta las{" "}
              <span className="font-semibold">{formatTimeInLima(registration.reservedUntil)}</span>.
              Si no pagas antes, se libera para otro jugador.
            </p>
          )}
          {mercadoPago.serviceFeeCents > 0 && (
            <dl className="grid grid-cols-2 gap-1 text-sm">
              <dt>Precio</dt>
              <dd className="text-right">{formatSoles(event.priceCents)}</dd>
              <dt>Cargo por servicio</dt>
              <dd className="text-right">{formatSoles(mercadoPago.serviceFeeCents)}</dd>
              <dt className="font-semibold">Total</dt>
              <dd className="text-right font-semibold">
                {formatSoles(event.priceCents + mercadoPago.serviceFeeCents)}
              </dd>
            </dl>
          )}
          <MercadoPagoCheckout
            action={payWithMercadoPagoAction}
            hidden={{ registrationId: registration.id }}
            publicKey={mercadoPago.publicKey}
            amountCents={event.priceCents + mercadoPago.serviceFeeCents}
          />
          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-500">
              ¿Ya le pagaste al organizador por fuera? Sube tu captura
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              <RejectionNotice registrationId={registration.id} />
              <PaymentInstructions info={await loadPaymentInfo(event.clubSlug, event.priceCents)} />
              <VoucherForm
                action={submitVoucherAction}
                hidden={{ registrationId: registration.id }}
                maxBytes={MAX_VOUCHER_BYTES}
                noteMaxLength={PAYER_NOTE_MAX_LENGTH}
              />
            </div>
          </details>
        </section>
      )}
      {awaitingPayment && !mercadoPago && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Paga y sube tu captura</h2>
          <RejectionNotice registrationId={registration.id} />
          <PaymentInstructions info={await loadPaymentInfo(event.clubSlug, event.priceCents)} />
          <VoucherForm
            action={submitVoucherAction}
            hidden={{ registrationId: registration.id }}
            maxBytes={MAX_VOUCHER_BYTES}
            noteMaxLength={PAYER_NOTE_MAX_LENGTH}
          />
        </section>
      )}
      {event.status !== "cancelled" && (
        <CancelSection registrationId={registration.id} priceCents={event.priceCents} />
      )}
    </>
  );
}

/** HU-29: "¿No puedes ir?", with what the player keeps under the club's policy (HU-30). */
async function CancelSection(props: { registrationId: string; priceCents: number }) {
  let preview: CancellationResult;
  try {
    preview = await getCancellationPreview(props.registrationId);
  } catch (error) {
    if (error instanceof CancellationNotAllowedError) return null;
    throw error;
  }
  const outcome: Record<CancellationResult, string> = {
    nothing_paid: "Tu cupo quedará libre para otro jugador.",
    balance: `Te quedará ${formatSoles(props.priceCents)} de saldo a favor para otra fecha del club.`,
    returned: "Recuperas tu fecha del plan o tu saldo.",
    forfeited: "Ya pasó el límite para cancelar: perderás lo que pagaste.",
    guest_forfeited:
      "Te inscribiste sin cuenta de Google, así que lo que pagaste no se puede guardar como saldo.",
  };
  return (
    <section className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">¿No puedes ir?</h2>
      <CancelRegistrationForm registrationId={props.registrationId} outcome={outcome[preview]} />
    </section>
  );
}

/** The club's Mercado Pago public key, when it takes Yape or card payments (HU-19). */
async function mercadoPagoCheckout(clubSlug: string, priceCents: number) {
  if (!isMercadoPagoConfigured()) return null;
  const club = await findClubBySlug(clubSlug);
  const status = club && (await getMercadoPagoStatus(club.id));
  if (!club || !status) return null;
  // HU-22: the same fee the charge adds, shown before paying.
  return { ...status, serviceFeeCents: await serviceFeeFor(club.id, priceCents) };
}

/** After a rejection the player is back to "pending payment": tell them why (HU-15). */
async function RejectionNotice({ registrationId }: { registrationId: string }) {
  const reason = await findLastVoucherRejection({ registrationId });
  if (!reason) return null;
  return <FormMessage tone="error">{`Tu captura anterior fue rechazada: ${reason}`}</FormMessage>;
}
