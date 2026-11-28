import type { Metadata } from "next";
import { MapPin, Package, ShoppingBag } from "lucide-react";
import { PageHeading, PageHeadingLoading } from "@/components/page-heading";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormMessage } from "@/components/form";
import { formatTimeRangeInLima, formatWeekdayDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { findClubBySlug, findClubNamesByIds, serviceFeeFor } from "@/modules/clubs";
import { listEventSummaries } from "@/modules/events";
import {
  findLastVoucherRejection,
  getMercadoPagoStatus,
  isMercadoPagoConfigured,
  MAX_VOUCHER_BYTES,
} from "@/modules/payments";
import { findOrder } from "@/modules/store";
import { PaymentInstructions } from "../../c/[club]/[event]/payment-instructions";
import { MercadoPagoCheckout } from "../../inscripcion/[registration]/mercado-pago-checkout";
import { VoucherForm } from "../../inscripcion/[registration]/voucher-form";
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from "../../order-status";
import { loadPaymentInfo } from "../../payment-info";
import { payOrderWithMercadoPagoAction, submitOrderVoucherAction } from "./actions";

// A private link: keep it out of search engines.
export const metadata: Metadata = {
  title: "Mi pedido · Convoley",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/pedido/[order]">;

/** HU-24: the player's order, where to pick it up and how to pay it. */
export default function OrderPage(props: Props) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8">
      <Suspense fallback={<PageHeadingLoading />}>
        <OrderContent {...props} />
      </Suspense>
    </main>
  );
}

async function OrderContent({ params, searchParams }: Props) {
  const order = await findOrder((await params).order);
  if (!order) notFound();
  const [[club], [pickup]] = await Promise.all([
    findClubNamesByIds([order.clubId]),
    listEventSummaries([order.pickupEventId]),
  ]);
  if (!club) notFound();
  const { enviado, pagado } = await searchParams;
  const awaitingPayment = order.status === "pending_payment";
  const mercadoPago = awaitingPayment
    ? await mercadoPagoCheckout(club.slug, order.totalCents)
    : null;
  const rejection = awaitingPayment ? await findLastVoucherRejection({ orderId: order.id }) : null;
  const voucher = awaitingPayment && (
    <>
      {rejection && (
        <FormMessage tone="error">{`Tu captura anterior fue rechazada: ${rejection}`}</FormMessage>
      )}
      <PaymentInstructions info={await loadPaymentInfo(club.slug, order.totalCents)} />
      <VoucherForm
        action={submitOrderVoucherAction}
        hidden={{ orderId: order.id }}
        maxBytes={MAX_VOUCHER_BYTES}
      />
    </>
  );

  return (
    <>
      <PageHeading
        icon={Package}
        eyebrow={`${club.name} · Tienda`}
        eyebrowHref={`/${club.slug}/tienda`}
        title="Tu pedido"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="first-letter:uppercase">
            {order.firstName} {order.lastName}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              ORDER_STATUS_BADGE_CLASSES[order.status],
            )}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </span>
      </PageHeading>
      <section
        aria-label="Resumen del pedido"
        className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
      >
        <ul className="flex flex-col gap-2 text-sm">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <ShoppingBag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                {item.productName}
                {item.size && <span className="text-muted-foreground"> · talla {item.size}</span>}
              </span>
              <span className="shrink-0 font-medium">× {item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-extrabold">{formatSoles(order.totalCents)}</span>
        </div>
        {pickup && (
          <p className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              Lo recoges en <span className="font-semibold">{pickup.title}</span>
              <span className="block text-muted-foreground">
                {formatWeekdayDateInLima(pickup.startsAt)}
              </span>
              <span className="block text-muted-foreground">{formatTimeRangeInLima(pickup)}</span>
            </span>
          </p>
        )}
      </section>
      {pagado && order.status === "paid" && (
        <FormMessage tone="ok">¡Pago confirmado! Recoge tu pedido en la convocatoria.</FormMessage>
      )}
      {enviado && (
        <FormMessage tone="ok">
          ¡Recibimos tu captura! El organizador la revisará pronto.
        </FormMessage>
      )}
      {order.status === "in_review" && (
        <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          El organizador está revisando tu pago.
        </p>
      )}
      {awaitingPayment && mercadoPago && (
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Paga con Yape o tarjeta</h2>
          {mercadoPago.serviceFeeCents > 0 && (
            <p className="text-sm">
              Cargo por servicio: {formatSoles(mercadoPago.serviceFeeCents)} · Total:{" "}
              <span className="font-semibold">
                {formatSoles(order.totalCents + mercadoPago.serviceFeeCents)}
              </span>
            </p>
          )}
          <MercadoPagoCheckout
            action={payOrderWithMercadoPagoAction}
            hidden={{ orderId: order.id }}
            publicKey={mercadoPago.publicKey}
            amountCents={order.totalCents + mercadoPago.serviceFeeCents}
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
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Paga y sube tu captura</h2>
          {voucher}
        </section>
      )}
    </>
  );
}

/** The club's Mercado Pago public key and fee, when it takes Yape or card payments. */
async function mercadoPagoCheckout(clubSlug: string, totalCents: number) {
  if (!isMercadoPagoConfigured()) return null;
  const club = await findClubBySlug(clubSlug);
  const status = club && (await getMercadoPagoStatus(club.id));
  if (!club || !status) return null;
  return { ...status, serviceFeeCents: await serviceFeeFor(club.id, totalCents) };
}
