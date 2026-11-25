import {
  BadgeCheck,
  ChartColumn,
  type LucideIcon,
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
import { formatInLima } from "@/lib/lima-time";
import { getClubSubscription } from "@/modules/billing";
import { can, findClubBySlug } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { requireOrganizer } from "./require-organizer";
import { SubscriptionBanner } from "./subscription-banner";

type Props = PageProps<"/admin/[club]">;

/** HU-33: the club's admin home; the menu shows only what the member's role can open. */
export default function ClubAdminHomePage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
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
    findClubBySlug(clubSlug),
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
        <SubscriptionBanner clubSlug={clubSlug} access={access} />
      </div>
      {canManage && (
        <Link
          href={`/admin/${clubSlug}/convocatorias/nueva`}
          className={buttonVariants({ size: "lg", className: "h-12 gap-2" })}
        >
          <Plus aria-hidden />
          Nueva convocatoria
        </Link>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Próximas convocatorias</h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
            No hay convocatorias publicadas.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/admin/${clubSlug}/convocatorias/${event.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{event.title}</span>
                    <span className="text-sm text-zinc-500 first-letter:uppercase">
                      {formatInLima(event.startsAt)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium dark:bg-zinc-800">
                    {event.remainingSpots} libres
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <nav aria-label="Menú del club" className="grid grid-cols-3 gap-2">
        {links.map(([path, label, Icon]) => (
          <Link
            key={path}
            href={`/admin/${clubSlug}/${path}`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 px-2 py-3 text-center text-xs font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <Icon className="size-5 text-zinc-600 dark:text-zinc-400" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
