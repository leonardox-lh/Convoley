import {
  BadgeCheck,
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
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatDayInLima, formatTimeRangeInLima } from "@/lib/lima-time";
import { venueMapsUrl } from "@/lib/maps";
import { getClubSubscription } from "@/modules/billing";
import { can, clubLogoPath, getClubProfile } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { requireOrganizer } from "./require-organizer";
import { SubscriptionBanner } from "./subscription-banner";

type Props = PageProps<"/admin/[club]">;

const LOGO_PX = 56;

/** HU-33: the club's admin home; the menu shows only what the member's role can open. */
export default function ClubAdminHomePage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-secondary" role="status" aria-label="Cargando…" />}>
        <ClubAdminHome params={params} />
      </Suspense>
    </main>
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
  ["suscripcion", "Suscripción", BadgeCheck],
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

  const freeSpots = events.reduce((total, event) => total + event.remainingSpots, 0);

  return (
    <div className="flex flex-col gap-6">
      <section
        data-club-hero
        className="relative -mx-4 -mt-8 overflow-hidden rounded-none bg-gradient-to-br from-primary via-primary to-primary/60 px-5 pt-20 pb-6 text-primary-foreground shadow-lg sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-5"
      >
        <div
          aria-hidden
          className="absolute -top-12 -right-12 size-40 rounded-full bg-white/15 blur-xl"
        />
        <div className="relative flex items-center gap-3">
          {club.logoKey ? (
            <Image
              src={clubLogoPath(club.logoKey)}
              alt=""
              width={LOGO_PX}
              height={LOGO_PX}
              unoptimized
              className="size-14 rounded-full bg-white object-cover ring-2 ring-white/60"
            />
          ) : (
            <span
              aria-hidden
              className="flex size-14 items-center justify-center rounded-full bg-white/20 text-2xl font-semibold"
            >
              {club.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm text-white/75">Panel del club</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">{club.name}</h1>
          </div>
        </div>
        <dl className="relative mt-5 flex gap-8">
          <Stat label="Convocatorias abiertas" value={events.length} />
          <Stat label="Cupos libres" value={freeSpots} />
        </dl>
      </section>
      <SubscriptionBanner clubSlug={clubSlug} access={access} />
      {canManage && (
        <Link
          href={`/admin/${clubSlug}/convocatorias/nueva`}
          className={buttonVariants({ size: "lg", className: "h-12 gap-2 text-base shadow-md" })}
        >
          <Plus aria-hidden />
          Nueva convocatoria
        </Link>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Próximas convocatorias</h2>
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No hay convocatorias publicadas. Crea una y compártela por WhatsApp.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => {
              const taken = event.capacity - event.remainingSpots;
              return (
                <li key={event.id} className="card-interactive group relative flex flex-col gap-3 p-4">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-white/80">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}
