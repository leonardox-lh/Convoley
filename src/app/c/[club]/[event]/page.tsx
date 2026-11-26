import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Clock, Info, MapPin, Navigation } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { buttonVariants } from "@/components/ui/button";
import { VolleyballIcon } from "@/components/volleyball";
import { formatInLima, formatTimeInLima, limaDateParts } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { ClubLogo } from "@/components/club-logo";
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
} from "@/modules/registrations";
import { loadEventPreview, seatsText, shareDescription } from "./event-preview";
import { loadPaymentInfo } from "../../../payment-info";
import { RegistrationForm } from "./registration-form";
import { SpotsBadge } from "../../../spots-badge";

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

// The app's blue when the club has no color of its own; the hero fades into night blue.
const DEFAULT_BRAND_COLOR = "#1d4ed8";
const HERO_NIGHT = "#0a1a4a";

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
  const [profile, lastSignUp] = userId
    ? await Promise.all([getPlayerProfile(userId), findLastPlayerChoices(userId)])
    : [null, null];
  // Mi perfil wins; the last sign-up fills what the profile leaves empty.
  const lastChoices = profile
    ? {
        position: profile.position ?? lastSignUp?.position ?? null,
        level: profile.level ?? lastSignUp?.level ?? null,
      }
    : lastSignUp;
  const seatsAreOpen = event.status === "published" || event.status === "full";
  const notice = STATUS_NOTICES[event.status];
  const cancellationNote =
    event.status === "cancelled" && event.cancellationOutcome
      ? CANCELLATION_NOTES[event.cancellationOutcome]
      : null;

  const date = limaDateParts(event.startsAt);
  const time = event.endsAt
    ? `${formatTimeInLima(event.startsAt)} – ${formatTimeInLima(event.endsAt)}`
    : formatTimeInLima(event.startsAt);
  const taken = event.capacity - event.freeSeats;
  const brandColor = clubProfile?.primaryColor ?? DEFAULT_BRAND_COLOR;

  return (
    <>
      <header
        className="relative -mx-4 overflow-hidden rounded-b-[2rem] px-5 pt-6 pb-14 text-white"
        style={{ backgroundImage: `linear-gradient(140deg, ${brandColor} 0%, ${HERO_NIGHT} 100%)` }}
      >
        <VolleyballIcon className="pointer-events-none absolute -top-10 -right-12 size-48 opacity-15" />
        <Link
          href={`/${club}`}
          aria-label={`Ver ${event.clubName}`}
          className="relative flex items-center gap-3"
        >
          <ClubLogo
            name={event.clubName}
            src={clubProfile?.logoKey ? clubLogoPath(clubProfile.logoKey) : null}
            className="size-12 rounded-xl"
          />
          <span
            className="text-sm font-semibold tracking-wide uppercase"
            style={{ color: clubProfile?.secondaryColor ?? undefined }}
          >
            {event.clubName}
          </span>
        </Link>
        <h1 className="relative mt-5 text-3xl leading-tight font-extrabold tracking-tight text-balance">
          {event.title}
        </h1>
        <div className="relative mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/15 px-3 py-1">{event.communityName}</span>
          {event.isMixed && <span className="rounded-full bg-white/15 px-3 py-1">Mixto</span>}
        </div>
      </header>

      <section
        aria-label="Detalles de la convocatoria"
        className="relative -mt-12 flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-lg shadow-black/5"
      >
        <div className="flex items-center gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl border text-center">
            <span className="w-full bg-primary py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
              {date.month}
            </span>
            <span className="py-1.5 text-2xl leading-none font-extrabold">{date.day}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold capitalize">{date.weekday}</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {time}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 font-medium first-letter:uppercase">
            {event.venueName}
          </span>
          {event.mapsUrl && (
            <a
              href={event.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1" })}
            >
              <Navigation aria-hidden />
              Cómo llegar
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Precio</span>
            <span className="text-2xl font-extrabold tracking-tight">
              {event.priceCents === 0 ? "Gratis" : formatSoles(event.priceCents)}
            </span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-muted-foreground">Cupos</span>
            {seatsAreOpen ? (
              <SpotsBadge free={event.freeSeats} capacity={event.capacity} className="mt-1.5" />
            ) : (
              <span className="mt-1 text-sm font-medium">{seatsText(event)}</span>
            )}
          </div>
        </div>
        {seatsAreOpen && (
          <div
            role="progressbar"
            aria-label="Cupos ocupados"
            aria-valuemin={0}
            aria-valuemax={event.capacity}
            aria-valuenow={taken}
            className="-mt-1 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(taken / Math.max(event.capacity, 1)) * 100}%` }}
            />
          </div>
        )}
      </section>

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
      {(isOpenForRegistration(event, now) || waitlistOnly) && (
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
      )}
    </>
  );
}

/** Who signed up, when the organizer made the list public. First name and initial only. */
async function PublicRoster({ eventId, capacity }: { eventId: string; capacity: number }) {
  const roster = buildRoster(await listEventRegistrations({ eventId }));
  const shortName = (name: string) => name.replace(/^(\S+)\s+(\S).*$/, "$1 $2.");
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
        <ol className="grid grid-cols-2 gap-2">
          {roster.players.map((player) => (
            <li
              key={player.number}
              className="flex min-w-0 items-center gap-2 rounded-xl border bg-card px-2.5 py-2 text-sm"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {player.number}
              </span>
              <span className="truncate">{shortName(player.name)}</span>
            </li>
          ))}
        </ol>
      )}
      {roster.waitlist.length > 0 && (
        <p className="text-sm text-zinc-500">
          En lista de espera: {roster.waitlist.map((player) => shortName(player.name)).join(", ")}
        </p>
      )}
    </section>
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
