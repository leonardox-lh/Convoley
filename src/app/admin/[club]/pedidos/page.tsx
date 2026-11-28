import { VolleyballLoader } from "@/components/volleyball";
import { PanelIntro } from "../panel-hero";
import { MapPin, Package, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { formatTimeRangeInLima, formatWeekdayDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { findClubBySlug } from "@/modules/clubs";
import { listEventSummaries } from "@/modules/events";
import { listVouchersInReview, signVoucherPath } from "@/modules/payments";
import { REJECTION_REASON_MAX_LENGTH } from "@/modules/registrations";
import { listOrders, type OrderFilter } from "@/modules/store";
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from "../../../order-status";
import { requireOrganizer } from "../require-organizer";
import { OrderActions } from "./order-actions";
import { StatusFilter } from "./status-filter";

type Props = PageProps<"/admin/[club]/pedidos">;

// The URL speaks Spanish (?estado=pendiente); the module speaks English.
const FILTERS: Record<string, { filter: OrderFilter; label: string }> = {
  pendiente: { filter: "pending", label: "Pendientes" },
  pagado: { filter: "paid", label: "Pagados" },
  entregado: { filter: "delivered", label: "Entregados" },
  cancelado: { filter: "cancelled", label: "Cancelados" },
};
const filterSchema = z
  .enum(Object.keys(FILTERS) as [string, ...string[]])
  .optional()
  .catch(undefined);

/** HU-25: the club's orders by status, with voucher review and "delivered". */
export default function OrdersPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<VolleyballLoader />}>
        <OrdersContent {...props} />
      </Suspense>
    </main>
  );
}

async function OrdersContent({ params, searchParams }: Props) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();
  const estado = filterSchema.parse((await searchParams).estado);
  const orders = await listOrders(club.id, estado ? FILTERS[estado]!.filter : null);
  const [vouchers, pickups] = await Promise.all([
    listVouchersInReview(
      orders.filter((order) => order.status === "in_review").map((order) => order.id),
      "orderId",
    ),
    listEventSummaries([...new Set(orders.map((order) => order.pickupEventId))]),
  ]);
  const basePath = `/admin/${clubSlug}/pedidos`;

  return (
    <div className="flex flex-col gap-4">
      <PanelIntro
        footer={
          <>
            <Link
              href={`/admin/${clubSlug}/tienda`}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Tienda
            </Link>
          </>
        }
      />
      <StatusFilter
        basePath={basePath}
        value={estado}
        options={Object.entries(FILTERS).map(([value, { label }]) => ({ value, label }))}
      />
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Package className="size-8 opacity-60" aria-hidden />
          No hay pedidos{estado ? ` ${FILTERS[estado]!.label.toLowerCase()}` : ""}.
        </div>
      ) : (
        <ul aria-label="Pedidos" className="flex flex-col gap-3">
          {orders.map((order) => {
            const voucher = vouchers.get(order.id);
            const pickup = pickups.find((event) => event.id === order.pickupEventId);
            const canDeliver = order.status === "paid";
            return (
              <li
                key={order.id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate font-semibold first-letter:uppercase">
                      {order.firstName} {order.lastName}
                    </p>
                    <a
                      href={`tel:${order.phone}`}
                      className="flex w-fit items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      <Phone className="size-3.5 shrink-0" aria-hidden />
                      {order.phone.replace(/^\+51/, "")}
                    </a>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      ORDER_STATUS_BADGE_CLASSES[order.status],
                    )}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <ul className="flex flex-col gap-1 rounded-xl bg-secondary/60 px-3 py-2.5 text-sm">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <ShoppingBag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {item.productName}
                        {item.size && (
                          <span className="text-muted-foreground"> · talla {item.size}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-end justify-between gap-3">
                  {pickup ? (
                    <p className="flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>
                        Recoge en {pickup.title}
                        <span className="block">{formatWeekdayDateInLima(pickup.startsAt)}</span>
                        <span className="block">{formatTimeRangeInLima(pickup)}</span>
                      </span>
                    </p>
                  ) : (
                    <span />
                  )}
                  <p className="shrink-0 text-lg font-extrabold">{formatSoles(order.totalCents)}</p>
                </div>
                {(voucher || canDeliver) && (
                  <div className="border-t pt-3">
                    <OrderActions
                      clubSlug={clubSlug}
                      orderId={order.id}
                      playerName={order.firstName}
                      reasonMaxLength={REJECTION_REASON_MAX_LENGTH}
                      canDeliver={canDeliver}
                      voucher={
                        voucher
                          ? {
                              imageUrl: voucher.proofFileKey
                                ? signVoucherPath(voucher.proofFileKey)
                                : null,
                              securityCode: voucher.yapeSecurityCode,
                              note: voucher.payerNote,
                            }
                          : null
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
