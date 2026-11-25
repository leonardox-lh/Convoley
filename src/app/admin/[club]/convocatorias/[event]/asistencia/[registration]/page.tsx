import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { getOrganizerEvent } from "@/modules/events";
import { listEventRegistrations } from "@/modules/registrations";
import {
  REGISTRATION_STATUS_BADGE_CLASSES,
  REGISTRATION_STATUS_LABELS,
} from "../../../../../../registration-status";
import { requireOrganizer } from "../../../../require-organizer";
import { CheckInButton } from "../../check-in-button";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/asistencia/[registration]">;

export default function AttendancePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <AttendanceContent {...props} />
      </Suspense>
    </main>
  );
}

/**
 * HU-38: where the player's QR leads. Opening it never marks anything: the organizer confirms
 * with the button, after seeing who it is and whether they paid.
 */
async function AttendanceContent({ params }: Props) {
  const { club: clubSlug, event: eventId, registration: registrationId } = await params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) notFound();
  const event = await getOrganizerEvent({ clubSlug, eventId });
  if (!event) notFound();
  const registration = (await listEventRegistrations({ eventId: event.id })).find(
    (r) => r.id === registrationId,
  );
  if (!registration) notFound();
  const canCheckIn =
    event.status !== "cancelled" &&
    registration.status !== "waitlisted" &&
    registration.status !== "cancelled";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-zinc-500">{event.title}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {registration.firstName} {registration.lastName}
        </h1>
      </div>
      <p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-sm font-medium",
            REGISTRATION_STATUS_BADGE_CLASSES[registration.status],
          )}
        >
          {REGISTRATION_STATUS_LABELS[registration.status]}
        </span>
      </p>
      {registration.checkedInAt && (
        <p className="text-lg font-medium">Ya marcaste su asistencia.</p>
      )}
      {canCheckIn ? (
        <CheckInButton
          clubSlug={clubSlug}
          eventId={event.id}
          registrationId={registration.id}
          checkedIn={registration.checkedInAt !== null}
          size="lg"
        />
      ) : (
        <p className="text-sm text-zinc-500">Esta inscripción no tiene cupo en la convocatoria.</p>
      )}
      <Link
        href={`/admin/${clubSlug}/convocatorias/${event.id}`}
        className="text-sm underline underline-offset-4"
      >
        Ver la lista completa
      </Link>
    </div>
  );
}
