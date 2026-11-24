import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { getPublicEvent, type CancellationOutcome, type EventStatus } from "@/modules/events";
import { currentUserId, isGoogleSignInEnabled } from "@/modules/identity";
import { isOpenForRegistration } from "@/modules/registrations";
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
  const event = await getPublicEvent({ clubSlug: club, eventId });
  if (!event) notFound();
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
        <dd className="first-letter:uppercase">{formatInLima(event.startsAt)}</dd>
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
        <dd>{event.capacity}</dd>
        {event.isMixed && (
          <>
            <dt className="text-zinc-500">Tipo</dt>
            <dd>Mixto</dd>
          </>
        )}
      </dl>
      {event.rules && <p className="text-sm whitespace-pre-line">{event.rules}</p>}
      {isOpenForRegistration(event, new Date()) && (
        <RegistrationForm
          club={club}
          eventId={event.id}
          signedIn={(await currentUserId()) !== null}
          googleEnabled={isGoogleSignInEnabled}
        />
      )}
    </>
  );
}
