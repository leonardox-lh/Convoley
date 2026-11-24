import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { clubLogoPath, getClubProfile } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";

const LOGO_PX = 96;

type Params = PageProps<"/[club]">["params"];

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
    <main className="mx-auto w-full max-w-md flex-1">
      <Suspense fallback={<p className="px-4 py-8 text-sm text-zinc-500">Cargando…</p>}>
        <PublicClubContent params={params} />
      </Suspense>
    </main>
  );
}

async function PublicClubContent({ params }: { params: Params }) {
  const slug = (await params).club;
  const [club, events] = await Promise.all([getClubProfile(slug), listOpenEvents(slug)]);
  if (!club || !events) notFound();

  return (
    <>
      <header
        className="flex flex-col items-center gap-3 px-4 py-8 text-center text-white"
        style={{ backgroundColor: club.primaryColor ?? undefined }}
      >
        {club.logoKey && (
          <Image
            src={clubLogoPath(club.logoKey)}
            alt={`Logo de ${club.name}`}
            width={LOGO_PX}
            height={LOGO_PX}
            unoptimized
            className="size-24 rounded-full bg-white object-cover"
          />
        )}
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: club.secondaryColor ?? undefined }}
        >
          {club.name}
        </h1>
      </header>
      <section className="flex flex-col gap-3 px-4 py-6">
        {club.description && <p className="whitespace-pre-line">{club.description}</p>}
        <div className="flex gap-4 text-sm font-medium">
          {club.instagramUrl && (
            <a
              href={club.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Instagram
            </a>
          )}
          {club.tiktokUrl && (
            <a
              href={club.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              TikTok
            </a>
          )}
        </div>
      </section>
      <section aria-labelledby="events-heading" className="flex flex-col gap-3 px-4 pb-8">
        <h2 id="events-heading" className="text-lg font-semibold">
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
      className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 active:bg-zinc-50 dark:border-zinc-800 dark:active:bg-zinc-900"
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
      <span className="text-sm first-letter:uppercase">{formatInLima(event.startsAt)}</span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{event.venueName}</span>
      <span className="text-sm font-medium">{formatSoles(event.priceCents)}</span>
    </Link>
  );
}

function spotsLabel(spots: number): string {
  return spots === 1 ? "Queda 1 cupo" : `Quedan ${spots} cupos`;
}
