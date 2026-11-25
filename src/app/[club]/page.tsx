import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { VolleyballLoader } from "@/components/volleyball";
import { formatEventTimeInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { getClubProfile as readClubProfile } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";


type Params = PageProps<"/[club]">["params"];

// Metadata and page read the same profile in one request.
const getClubProfile = cache(readClubProfile);

type OpenEvent = NonNullable<Awaited<ReturnType<typeof listOpenEvents>>>[number];

// Shown when the link is shared on WhatsApp or Instagram; the OG image comes with HU-17.
export async function generateMetadata({ params }: PageProps<"/[club]">): Promise<Metadata> {
  const club = await getClubProfile((await params).club);
  if (!club) return {};
  const description = club.description ?? `Convocatorias de vóley de ${club.name}`;
  return {
    title: `${club.name} · Convoley`,
    description,
    openGraph: { title: club.name, description, type: "website" },
  };
}

/** convoley.pe/<club>: the club's profile and its open events; no account needed. */
export default function PublicClubPage({ params }: PageProps<"/[club]">) {
  return (
    <main className="p-4">
      <Suspense fallback={<VolleyballLoader />}>
        <PublicClubContent params={params} />
      </Suspense>
      <Suspense>
        <RequestTimeMetadata />
      </Suspense>
    </main>
  );
}

// The metadata reads the club from the database on every request, so the page says so too.
async function RequestTimeMetadata() {
  await connection();
  return null;
}

async function PublicClubContent({ params }: { params: Params }) {
  const slug = (await params).club;
  const [club, events] = await Promise.all([getClubProfile(slug), listOpenEvents(slug)]);
  if (!club || !events) notFound();

  return (
    <>
      <section aria-labelledby="events-heading" className="flex flex-col gap-3">
        <h2 id="events-heading" className="sr-only">
          Convocatorias
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Este club no tiene convocatorias abiertas por ahora.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id}>
                <EventCard clubSlug={slug} event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function EventCard({ clubSlug, event }: { clubSlug: string; event: OpenEvent }) {
  const isFull = event.remainingSpots === 0;
  return (
    <Link
      href={`/c/${clubSlug}/${event.id}`}
      className="card-interactive flex flex-col gap-1 p-4"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium">{event.title}</span>
        <span
          className={
            isFull
              ? "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {isFull ? "Llena" : spotsLabel(event.remainingSpots)}
        </span>
      </span>
      <span className="text-sm first-letter:uppercase">{formatEventTimeInLima(event)}</span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{event.venueName}</span>
      <span className="text-sm font-medium">{formatSoles(event.priceCents)}</span>
    </Link>
  );
}

function spotsLabel(spots: number): string {
  return spots === 1 ? "Queda 1 cupo" : `Quedan ${spots} cupos`;
}
