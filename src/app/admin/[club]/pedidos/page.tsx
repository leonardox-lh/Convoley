import { PageHeading, PageHeadingLoading } from "@/components/page-heading";
import { Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { formatInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { findClubBySlug } from "@/modules/clubs";
import { listEventSummaries } from "@/modules/events";
import { listVouchersInReview, signVoucherPath } from "@/modules/payments";
import { listOrders, type OrderFilter } from "@/modules/store";
import { ORDER_STATUS_LABELS } from "../../../order-status";
import { requireOrganizer } from "../require-organizer";
import { OrderActions } from "./order-actions";

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
      <Suspense fallback={<PageHeadingLoading />}>
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
    <div className="flex flex-col gap-6">
      <PageHeading
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
        icon={Package}
        eyebrow="Gestiona tu club"
        title="Pedidos"
      />
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        <FilterLink href={basePath} active={!estado} label="Todos" />
        {Object.entries(FILTERS).map(([value, { label }]) => (
          <FilterLink
            key={value}
            href={`${basePath}?estado=${value}`}
            active={estado === value}
            label={label}
          />
        ))}
      </nav>
      {orders.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay pedidos.</p>
      ) : (
        <ul
          aria-label="Pedidos"
          className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
        >
          {orders.map((order) => {
            const voucher = vouchers.get(order.id);
            const pickup = pickups.find((event) => event.id === order.pickupEventId);
            return (
              <li key={order.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {order.firstName} {order.lastName}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {order.phone.replace(/^\+51/, "")} · {formatSoles(order.totalCents)}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-sm">
                  {order.items
                    .map(
                      (item) =>
                        `${item.quantity} × ${item.productName}${item.size ? ` (${item.size})` : ""}`,
                    )
                    .join(", ")}
                </p>
                {pickup && (
                  <p className="text-sm text-zinc-500">
                    Recoge en {pickup.title} · {formatInLima(pickup.startsAt)}
                  </p>
                )}
                <OrderActions
                  clubSlug={clubSlug}
                  orderId={order.id}
                  canDeliver={order.status === "paid"}
                  voucher={
                    voucher
                      ? {
                          imageUrl: voucher.proofFileKey
                            ? signVoucherPath(voucher.proofFileKey)
                            : null,
                          securityCode: voucher.yapeSecurityCode,
                        }
                      : null
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-zinc-300 dark:border-zinc-700",
      )}
    >
      {label}
    </Link>
  );
}
