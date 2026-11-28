import type { Metadata } from "next";
import { CalendarDays, Clock, MapPin, Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ClubLogo } from "@/components/club-logo";
import { PageHeading } from "@/components/page-heading";
import { VolleyballLoader } from "@/components/volleyball";
import { buttonVariants } from "@/components/ui/button";
import { formatTimeRangeInLima, formatWeekdayDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { clubLogoPath, findClubNamesByIds } from "@/modules/clubs";
import { listEventSummaries } from "@/modules/events";
import { currentUserId } from "@/modules/identity";
import { listPlayerOrders } from "@/modules/store";
import { RETURN_PATH_PARAM } from "../ingresar/sign-in-with-password";
import { ORDER_STATUS_BADGE_CLASSES, ORDER_STATUS_LABELS } from "../order-status";

export const metadata: Metadata = { title: "Mis pedidos · Convoley" };

const PAGE_PATH = "/mis-pedidos";

/** The signed-in player's store orders, so a pending one can be found and paid later. */
export default function MyOrdersPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-8">
      <PageHeading icon={Package} eyebrow="Convoley" title="Mis pedidos" />
      <Suspense fallback={<VolleyballLoader />}>
        <MyOrders />
      </Suspense>
    </main>
  );
}

async function MyOrders() {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-500">Inicia sesión para ver tus pedidos y pagarlos.</p>
        <Link
          href={`/ingresar?${RETURN_PATH_PARAM}=${encodeURIComponent(PAGE_PATH)}`}
          className={cn(buttonVariants({ size: "lg" }), "h-11")}
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const orders = await listPlayerOrders(userId);
  if (orders.length === 0) {
    return <p className="text-sm text-zinc-500">Todavía no hiciste ningún pedido.</p>;
  }
  const [clubRows, pickupRows] = await Promise.all([
    findClubNamesByIds([...new Set(orders.map((order) => order.clubId))]),
    listEventSummaries([...new Set(orders.map((order) => order.pickupEventId))]),
  ]);
  const clubs = new Map(clubRows.map((club) => [club.id, club]));
  const pickups = new Map(pickupRows.map((event) => [event.id, event]));

  return (
    <ul aria-label="Mis pedidos" className="flex flex-col gap-3">
      {orders.map((order) => {
        const club = clubs.get(order.clubId);
        const pickup = pickups.get(order.pickupEventId);
        return (
          <li key={order.id}>
            {/* The order page shows where to pick it up and how to pay it. */}
            <Link
              href={`/pedido/${order.id}`}
              className="flex flex-col gap-2 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <ClubLogo
                  name={club?.name ?? ""}
                  src={club?.logoKey ? clubLogoPath(club.logoKey) : null}
                  className="size-11 rounded-xl bg-primary/10 text-lg text-primary shadow-none ring-1 ring-border"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-muted-foreground">
                    {club?.name}
                  </span>
                  <span className="leading-tight font-semibold">
                    {order.items
                      .map(
                        (item) =>
                          `${item.quantity} × ${item.productName}${item.size ? ` (${item.size})` : ""}`,
                      )
                      .join(", ")}
                  </span>
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
              <div className="flex items-end justify-between gap-3 text-sm text-muted-foreground">
                {pickup ? (
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">Recoges en {pickup.title}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="size-4 shrink-0" aria-hidden />
                      {formatWeekdayDateInLima(pickup.startsAt)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-4 shrink-0" aria-hidden />
                      {formatTimeRangeInLima(pickup)}
                    </p>
                  </div>
                ) : (
                  <span />
                )}
                <span className="shrink-0 font-semibold text-foreground">
                  {formatSoles(order.totalCents)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
