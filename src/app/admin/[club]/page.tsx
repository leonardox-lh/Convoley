import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

const ADMIN_LINKS = [
  ["convocatorias/nueva", "Nueva convocatoria"],
  ["recurrentes", "Convocatorias recurrentes"],
  ["perfil", "Perfil del club"],
  ["comunidades", "Comunidades"],
  ["pagos", "Cobros"],
  ["tienda", "Tienda"],
  ["planes", "Planes"],
  ["suscripcion", "Suscripción"],
  ["organizadores", "Organizadores"],
] as const;

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
  const links = [
    ...(can(organizer.role, "manage_club") ? ADMIN_LINKS : []),
    ["pedidos", "Pedidos"] as const,
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
      <SubscriptionBanner clubSlug={clubSlug} access={access} />
      <nav aria-label="Menú del club" className="flex flex-wrap gap-2">
        {links.map(([path, label]) => (
          <Link
            key={path}
            href={`/admin/${clubSlug}/${path}`}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Próximas convocatorias</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay convocatorias publicadas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {events.map((event) => (
              <li key={event.id} className="py-3">
                <Link
                  href={`/admin/${clubSlug}/convocatorias/${event.id}`}
                  className="flex flex-col"
                >
                  <span className="font-medium">{event.title}</span>
                  <span className="text-sm text-zinc-500">
                    {formatInLima(event.startsAt)} · {event.remainingSpots} cupos libres
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
