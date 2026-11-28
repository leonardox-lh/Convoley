import {
  ChartColumn,
  ChevronRight,
  Clock,
  type LucideIcon,
  MapPin,
  Package,
  Plus,
  Repeat,
  ShoppingBag,
  Store,
  Ticket,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDayInLima, formatTimeRangeInLima } from "@/lib/lima-time";
import { venueMapsUrl } from "@/lib/maps";
import { getClubSubscription } from "@/modules/billing";
import { can, getClubProfile } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { VolleyballLoader } from "@/components/volleyball";
import { requireOrganizer } from "../require-organizer";
import { SubscriptionBanner } from "../subscription-banner";

type Props = PageProps<"/admin/[club]">;

/** HU-33: the club's admin home; the menu shows only what the member's role can open. */
export default function ClubAdminHomePage({ params }: Props) {
  return (
    <Suspense fallback={<VolleyballLoader />}>
      <ClubAdminHome params={params} />
    </Suspense>
  );
}

const ADMIN_LINKS: [string, string, LucideIcon][] = [
  ["recurrentes", "Recurrentes", Repeat],
  ["perfil", "Perfil del club", Store],
  ["comunidades", "Comunidades", Users],
  ["pagos", "Cobros", Wallet],
  ["tienda", "Tienda", ShoppingBag],
  ["planes", "Planes", Ticket],
  ["finanzas", "Finanzas", ChartColumn],
  ["organizadores", "Organizadores", UserCog],
];

async function ClubAdminHome({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  const organizer = await requireOrganizer(clubSlug, "run_game_day");
  if (!organizer) notFound();
  const [club, events, { access }] = await Promise.all([
    getClubProfile(clubSlug),
    listOpenEvents(clubSlug),
    getClubSubscription(organizer.clubId),
  ]);
  if (!club || !events) notFound();
  const canManage = can(organizer.role, "manage_club");
  const links: [string, string, LucideIcon][] = [
    ...(canManage ? ADMIN_LINKS : []),
    ["pedidos", "Pedidos", Package],
  ];

  return (
    <div className="flex flex-col gap-6">
      <SubscriptionBanner clubSlug={clubSlug} access={access} />
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Próximas convocatorias</h2>
          {canManage && (
            <Link
              href={`/admin/${clubSlug}/convocatorias/nueva`}
              aria-label="Nueva convocatoria"
              // cn merges the classes, so the blue border wins over the variant's (buttonVariants only joins them).
              className={cn(
                buttonVariants({ variant: "outline" }),
                "gap-1.5 border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              <Plus aria-hidden />
              {/* Trimmed to the letters' height so flex centers what you see, not Geist's line box. */}
              <span className="[text-box:trim-both_cap_alphabetic]">Nueva</span>
            </Link>
          )}
        </div>
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay convocatorias publicadas. Crea una y compártela por WhatsApp.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => {
              const taken = event.capacity - event.remainingSpots;
              return (
                <li
                  key={event.id}
                  className="card-interactive group relative flex flex-col gap-3 p-4"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      {/* The title's link covers the whole card; the Maps link sits above it. */}
                      <Link
                        href={`/admin/${clubSlug}/convocatorias/${event.id}`}
                        className="truncate font-medium after:absolute after:inset-0 after:rounded-2xl"
                      >
                        {event.title}
                      </Link>
                      <span className="text-sm text-muted-foreground first-letter:uppercase">
                        {formatDayInLima(event.startsAt)}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" aria-hidden />
                        {formatTimeRangeInLima(event)}
                      </span>
                      <a
                        href={venueMapsUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 flex w-fit max-w-full items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{event.venueName}</span>
                        <span className="sr-only">(ver en Google Maps)</span>
                      </a>
                    </span>
                    <ChevronRight
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      role="progressbar"
                      aria-label="Inscritos"
                      aria-valuemin={0}
                      aria-valuemax={event.capacity}
                      aria-valuenow={taken}
                      className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                    >
                      <span
                        className="block h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(taken / event.capacity) * 100}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {taken}/{event.capacity}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <nav aria-label="Menú del club" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Gestiona tu club</h2>
        <ul className="grid grid-cols-3 gap-2">
          {links.map(([path, label, Icon]) => (
            <li key={path}>
              <Link
                href={`/admin/${clubSlug}/${path}`}
                className="card-interactive group flex h-full flex-col items-center gap-2 px-2 py-4 text-center text-xs font-medium"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
