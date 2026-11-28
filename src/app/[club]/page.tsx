import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { EmptyTab } from "./empty-tab";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { VolleyballLoader } from "@/components/volleyball";
import { clubLogoPath, getClubProfile as readClubProfile } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { EVENT_LIST_CLASS, UpcomingEventCard } from "../upcoming-event-card";

type Params = PageProps<"/[club]">["params"];

// Metadata and page read the same profile in one request.
const getClubProfile = cache(readClubProfile);

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
          <EmptyTab icon={CalendarDays}>
            Este club no tiene convocatorias abiertas por ahora.
          </EmptyTab>
        ) : (
          // The same card as the home page's upcoming events.
          <ul className={EVENT_LIST_CLASS}>
            {events.map((event) => (
              <UpcomingEventCard
                key={event.id}
                event={{
                  ...event,
                  endsAt: event.endsAt ?? null,
                  href: `/c/${slug}/${event.id}`,
                  clubName: club.name,
                  clubLogoUrl: club.logoKey ? clubLogoPath(club.logoKey) : null,
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
