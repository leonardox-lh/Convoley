import type { Metadata } from "next";
import { GenderIcon } from "@/components/gender-icon";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Info } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { formatInLima } from "@/lib/lima-time";
import { clubLogoPath, getClubProfile } from "@/modules/clubs";
import { type CancellationOutcome, type EventStatus } from "@/modules/events";
import { getPaymentSettings } from "@/modules/clubs";
import { currentUserId, getPlayerProfile, isGoogleSignInEnabled } from "@/modules/identity";
import {
  acceptsWaitlist,
  buildRoster,
  cancellationDeadline,
  findLastPlayerChoices,
  isOpenForRegistration,
  listEventRegistrations,
  listPlayerRegistrations,
} from "@/modules/registrations";
import { loadEventPreview, seatsText, shareDescription } from "./event-preview";
import { loadPaymentInfo } from "../../../payment-info";
import { MyRegistration } from "./my-registration";
import { RegistrationForm } from "./registration-form";
import { SpotsBadge } from "../../../spots-badge";
import { EventHero } from "../../../event-hero";

const STATUS_NOTICES: Partial<Record<EventStatus, string>> = {
  full: "Convocatoria llena",
  closed: "Inscripciones cerradas",
  cancelled: "Convocatoria cancelada",
};

const CANCELLATION_NOTES: Record<CancellationOutcome, string> = {
  refund: "Si ya pagaste, el organizador te devolverá tu dinero.",
  balance: "Si ya pagaste, tu pago queda como saldo a favor para otra convocatoria del club.",
};

type Params = PageProps<"/c/[club]/[event]">["params"];

// Title and description WhatsApp shows with the link (HU-11); the image is opengraph-image.tsx.
export async function generateMetadata({
  params,
}: PageProps<"/c/[club]/[event]">): Promise<Metadata> {
  const { club, event: eventId } = await params;
  const event = await loadEventPreview(club, eventId);
  if (!event) return {};
  const title = `${event.title} · ${event.clubName}`;
  const description = shareDescription(event);
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default function PublicEventPage({ params }: PageProps<"/c/[club]/[event]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10">
      {/* Other players' sign-ups and payments show up without reloading. */}
      <AutoRefresh />
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PublicEventContent params={params} />
      </Suspense>
    </main>
  );
}

async function PublicEventContent({ params }: { params: Params }) {
  const { club, event: eventId } = await params;
  const [event, clubProfile] = await Promise.all([
    loadEventPreview(club, eventId),
    getClubProfile(club),
  ]);
  if (!event) notFound();
  const now = new Date();
  const waitlistOnly = acceptsWaitlist(event, now);
  const userId = await currentUserId();
  const [profile, lastSignUp, ownRegistrations] = userId
    ? await Promise.all([
        getPlayerProfile(userId),
        findLastPlayerChoices(userId),
        listPlayerRegistrations(userId),
      ])
    : [null, null, []];
  // Cancelled sign-ups are already left out: those players may sign up again.
  const myRegistration = ownRegistrations.find((row) => row.eventId === event.id) ?? null;
  // Mi perfil wins; the last sign-up fills what the profile leaves empty.
  const lastChoices = profile
    ? {
        position: profile.position ?? lastSignUp?.position ?? null,
        level: profile.level ?? lastSignUp?.level ?? null,
        gender: profile.gender ?? lastSignUp?.gender ?? null,
      }
    : lastSignUp;
  const seatsAreOpen = event.status === "published" || event.status === "full";
  const notice = STATUS_NOTICES[event.status];
  const cancellationNote =
    event.status === "cancelled" && event.cancellationOutcome
      ? CANCELLATION_NOTES[event.cancellationOutcome]
      : null;

  return (
    <>
      <EventHero
        clubHref={`/${club}`}
        event={{
          ...event,
          logoSrc: clubProfile?.logoKey ? clubLogoPath(clubProfile.logoKey) : null,
          primaryColor: clubProfile?.primaryColor ?? null,
          secondaryColor: clubProfile?.secondaryColor ?? null,
          taken: event.capacity - event.freeSeats,
        }}
        showSeatsBar={seatsAreOpen}
        seats={
          seatsAreOpen ? (
            <SpotsBadge free={event.freeSeats} capacity={event.capacity} className="mt-1.5" />
          ) : (
            <span className="mt-1 text-sm font-medium">{seatsText(event)}</span>
          )
        }
      />

      {notice && (
        <div
          role="status"
          className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          <p className="font-medium">{notice}</p>
          {cancellationNote && <p>{cancellationNote}</p>}
        </div>
      )}
      {event.rules && (
        <section className="flex gap-3 rounded-2xl bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">Del organizador</span>
            <p className="whitespace-pre-line text-muted-foreground">{event.rules}</p>
          </div>
        </section>
      )}
      {event.showRoster && event.status !== "cancelled" && (
        <PublicRoster eventId={event.id} capacity={event.capacity} />
      )}
      {event.status !== "cancelled" && event.priceCents > 0 && (
        <CancellationPolicyNote clubSlug={club} startsAt={event.startsAt} />
      )}
      {myRegistration ? (
        <MyRegistration
          registration={myRegistration}
          paymentInfo={await loadPaymentInfo(club, event.priceCents)}
        />
      ) : (
        (isOpenForRegistration(event, now) || waitlistOnly) && (
          <RegistrationForm
            waitlistOnly={waitlistOnly}
            paymentInfo={await loadPaymentInfo(club, event.priceCents)}
            club={club}
            eventId={event.id}
            profile={profile}
            lastChoices={lastChoices}
            googleEnabled={isGoogleSignInEnabled}
            isMixed={event.isMixed}
          />
        )
      )}
    </>
  );
}

/** Who signed up, when the organizer made the list public: full names, cut with … only if too long. */
async function PublicRoster({ eventId, capacity }: { eventId: string; capacity: number }) {
  const roster = buildRoster(await listEventRegistrations({ eventId }));
  return (
    <section aria-labelledby="roster-heading" className="flex flex-col gap-2">
      <h2 id="roster-heading" className="flex items-center justify-between text-lg font-semibold">
        Inscritos
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
          {roster.players.length}/{capacity}
        </span>
      </h2>
      {roster.players.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay inscritos. ¡Sé el primero!</p>
      ) : (
        <RosterGrid players={roster.players} />
      )}
      {roster.waitlist.length > 0 && (
        <>
          <h3
            id="waitlist-heading"
            className="mt-2 flex items-center justify-between text-lg font-semibold"
          >
            En espera
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {roster.waitlist.length}
            </span>
          </h3>
          <RosterGrid players={roster.waitlist} waitlist aria-labelledby="waitlist-heading" />
        </>
      )}
    </section>
  );
}

/** Two-column tiles: number badge and short name. The waitlist is numbered E1, E2… in amber. */
function RosterGrid(props: {
  players: { number: number; name: string; gender: string | null }[];
  waitlist?: boolean;
  "aria-labelledby"?: string;
}) {
  return (
    <ol aria-labelledby={props["aria-labelledby"]} className="grid grid-cols-2 gap-2">
      {props.players.map((player) => (
        <li
          key={player.number}
          className="flex min-w-0 items-center gap-2 rounded-xl border bg-card px-2.5 py-2 text-sm"
        >
          <span
            className={
              props.waitlist
                ? "flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            }
          >
            {props.waitlist ? `E${player.number}` : player.number}
          </span>
          <span className="min-w-0 flex-1 truncate" title={player.name}>
            {player.name}
          </span>
          <GenderIcon gender={player.gender} />
        </li>
      ))}
    </ol>
  );
}

/** HU-30: what happens with the payment if the player cancels. */
async function CancellationPolicyNote({
  clubSlug,
  startsAt,
}: {
  clubSlug: string;
  startsAt: Date;
}) {
  const settings = await getPaymentSettings(clubSlug);
  const deadline = cancellationDeadline(startsAt, settings?.cancellationDeadlineHours ?? null);
  return (
    <p className="text-sm text-zinc-500">
      {deadline
        ? `Si cancelas hasta el ${formatInLima(deadline)}, lo que pagaste queda como saldo a favor en el club. Después, se pierde.`
        : "Si cancelas después de pagar, pierdes lo que pagaste."}
    </p>
  );
}
