import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { PageHeading, PageHeadingLoading } from "@/components/page-heading";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { formatInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { findClubBySlug, findClubNamesByIds, serviceFeeFor } from "@/modules/clubs";
import {
  findLastVoucherRejection,
  getMercadoPagoStatus,
  isMercadoPagoConfigured,
  MAX_VOUCHER_BYTES,
} from "@/modules/payments";
import { findPlanPurchase } from "@/modules/plans";
import { PaymentInstructions } from "../../c/[club]/[event]/payment-instructions";
import { MercadoPagoCheckout } from "../../inscripcion/[registration]/mercado-pago-checkout";
import { PAYER_NOTE_MAX_LENGTH } from "../../inscripcion/[registration]/payer-note";
import { VoucherForm } from "../../inscripcion/[registration]/voucher-form";
import { loadPaymentInfo } from "../../payment-info";
import { PLAN_PURCHASE_STATUS_LABELS, planTermsText } from "../../plan-terms";
import { payPlanWithMercadoPagoAction, submitPlanVoucherAction } from "./actions";

// A private link: keep it out of search engines.
export const metadata: Metadata = {
  title: "Mi plan · Convoley",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/plan/[purchase]">;

/** HU-27: the player's plan: how to pay it and, once active, the dates left. */
export default function PlanPurchasePage(props: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8">
      <Suspense fallback={<PageHeadingLoading />}>
        <PurchaseContent {...props} />
      </Suspense>
    </main>
  );
}

async function PurchaseContent({ params, searchParams }: Props) {
  const purchase = await findPlanPurchase((await params).purchase);
  if (!purchase) notFound();
  const [club] = await findClubNamesByIds([purchase.clubId]);
  if (!club) notFound();
  const { enviado, pagado } = await searchParams;
  const priceCents = purchase.plan.priceCents;
  const awaitingPayment = purchase.status === "pending_payment";
  const mercadoPago = awaitingPayment ? await mercadoPagoCheckout(club.slug, priceCents) : null;
  const rejection = awaitingPayment
    ? await findLastVoucherRejection({ planPurchaseId: purchase.id })
    : null;
  const voucher = awaitingPayment && (
    <>
      {rejection && (
        <FormMessage tone="error">{`Tu captura anterior fue rechazada: ${rejection}`}</FormMessage>
      )}
      <PaymentInstructions info={await loadPaymentInfo(club.slug, priceCents)} />
      <VoucherForm
        action={submitPlanVoucherAction}
        hidden={{ purchaseId: purchase.id }}
        maxBytes={MAX_VOUCHER_BYTES}
        noteMaxLength={PAYER_NOTE_MAX_LENGTH}
      />
    </>
  );

  return (
    <>
      <PageHeading
        icon={Ticket}
        eyebrow={`${club.name} · Planes`}
        eyebrowHref={`/${club.slug}/planes`}
        title={purchase.plan.name}
        footer={
          <p className="text-white/80">
            {formatSoles(priceCents)} · {planTermsText(purchase.plan)}
          </p>
        }
      >
        {purchase.firstName} {purchase.lastName} · {PLAN_PURCHASE_STATUS_LABELS[purchase.status]}
      </PageHeading>
      {purchase.status === "active" && (
        <p className="text-sm">
          {purchase.creditsRemaining === null
            ? "Fechas ilimitadas"
            : `Te quedan ${purchase.creditsRemaining} ${purchase.creditsRemaining === 1 ? "fecha" : "fechas"}`}
          {purchase.expiresAt && ` · vence el ${formatInLima(purchase.expiresAt)}`}. Al inscribirte
          con tu celular o tu cuenta de Google podrás usarlas.
        </p>
      )}
      {pagado && purchase.status === "active" && (
        <FormMessage tone="ok">¡Pago confirmado! Tu plan ya está activo.</FormMessage>
      )}
      {enviado && (
        <FormMessage tone="ok">
          ¡Recibimos tu captura! El organizador la revisará pronto.
        </FormMessage>
      )}
      {purchase.status === "in_review" && (
        <p className="text-sm text-zinc-500">El organizador está revisando tu pago.</p>
      )}
      {awaitingPayment && mercadoPago && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Paga con Yape o tarjeta</h2>
          {mercadoPago.serviceFeeCents > 0 && (
            <p className="text-sm">
              Cargo por servicio: {formatSoles(mercadoPago.serviceFeeCents)} · Total:{" "}
              <span className="font-semibold">
                {formatSoles(priceCents + mercadoPago.serviceFeeCents)}
              </span>
            </p>
          )}
          <MercadoPagoCheckout
            action={payPlanWithMercadoPagoAction}
            hidden={{ purchaseId: purchase.id }}
            publicKey={mercadoPago.publicKey}
            amountCents={priceCents + mercadoPago.serviceFeeCents}
          />
          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-500">
              ¿Ya le pagaste al organizador por fuera? Sube tu captura
            </summary>
            <div className="mt-3 flex flex-col gap-4">{voucher}</div>
          </details>
        </section>
      )}
      {awaitingPayment && !mercadoPago && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Paga y sube tu captura</h2>
          {voucher}
        </section>
      )}
    </>
  );
}

/** The club's Mercado Pago public key and fee, when it takes Yape or card payments. */
async function mercadoPagoCheckout(clubSlug: string, priceCents: number) {
  if (!isMercadoPagoConfigured()) return null;
  const club = await findClubBySlug(clubSlug);
  const status = club && (await getMercadoPagoStatus(club.id));
  if (!club || !status) return null;
  return { ...status, serviceFeeCents: await serviceFeeFor(club.id, priceCents) };
}
