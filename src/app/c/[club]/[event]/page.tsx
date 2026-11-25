import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatInLima, formatEventTimeInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { type CancellationOutcome, type EventStatus } from "@/modules/events";
import { getPaymentSettings } from "@/modules/clubs";
import { currentUserId, getPlayerProfile, isGoogleSignInEnabled } from "@/modules/identity";
import {
  acceptsWaitlist,
  buildRoster,
  cancellationDeadline,
  isOpenForRegistration,
  listEventRegistrations,
} from "@/modules/registrations";
import { loadEventPreview, seatsText, shareDescription } from "./event-preview";
import { loadPaymentInfo } from "../../../payment-info";
import { RegistrationForm } from "./registration-form";

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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PublicEventContent params={params} />
      </Suspense>
    </main>
  );
}

async function PublicEventContent({ params }: { params: Params }) {
  const { club, event: eventId } = await params;
  const event = await loadEventPreview(club, eventId);
  if (!event) notFound();
  const now = new Date();
  const waitlistOnly = acceptsWaitlist(event, now);
  const userId = await currentUserId();
  const profile = userId ? await getPlayerProfile(userId) : null;
  const notice = STATUS_NOTICES[event.status];
  const cancellationNote =
    event.status === "cancelled" && event.cancellationOutcome
      ? CANCELLATION_NOTES[event.cancellationOutcome]
      : null;

  return (
    <>
      <div>
        <p className="text-sm text-zinc-500">
          {event.clubName} · {event.communityName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
      </div>
      {notice && (
        <div
          role="status"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          <p className="font-medium">{notice}</p>
          {cancellationNote && <p>{cancellationNote}</p>}
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Cuándo</dt>
        <dd className="first-letter:uppercase">{formatEventTimeInLima(event)}</dd>
        <dt className="text-zinc-500">Dónde</dt>
        <dd>
          {event.venueName}
          {event.mapsUrl && (
            <>
              {" · "}
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver en Maps
              </a>
            </>
          )}
        </dd>
        <dt className="text-zinc-500">Precio</dt>
        <dd>{formatSoles(event.priceCents)}</dd>
        <dt className="text-zinc-500">Cupos</dt>
        <dd>
          {event.capacity} · {seatsText(event)}
        </dd>
        {event.isMixed && (
          <>
            <dt className="text-zinc-500">Tipo</dt>
            <dd>Mixto</dd>
          </>
        )}
      </dl>
      {event.rules && <p className="text-sm whitespace-pre-line">{event.rules}</p>}
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
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-medium text-secondary-foreground">
          {roster.players.length}/{capacity}
        </span>
      </h2>
      {roster.players.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay inscritos. ¡Sé el primero!</p>
      ) : (
        <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
          {roster.players.map((player) => (
            <li key={player.number} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {player.number}
              </span>
              {shortName(player.name)}
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
