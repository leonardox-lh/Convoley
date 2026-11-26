import { Pencil } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { limaDateAndTime, todayInLima } from "@/lib/lima-time";
import { centsToSolesText } from "@/lib/money";
import { getOrganizerEvent, type CancellationOutcome } from "@/modules/events";
import { requireOrganizer } from "../../../require-organizer";
import { CancelEventForm } from "./cancel-event-form";
import { EditEventForm } from "./edit-event-form";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/editar">;

const OUTCOME_LABELS: Record<CancellationOutcome, string> = {
  refund: "los pagos quedaron marcados para devolución",
  balance: "los pagos quedaron como saldo a favor",
};

export default function EditEventPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <EditEventContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditEventContent({ params }: { params: Props["params"] }) {
  const { club: clubSlug, event: eventId } = await params;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const event = await getOrganizerEvent({ clubSlug, eventId });
  if (!event) notFound();
  const { date, time } = limaDateAndTime(event.startsAt);
  const endTime = event.endsAt ? limaDateAndTime(event.endsAt).time : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        icon={Pencil}
        eyebrow={event.club.name}
        title="Editar convocatoria"
        footer={
          <div className="flex gap-4">
            <Link
              href={`/admin/${clubSlug}/convocatorias/${event.id}`}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Ver inscritos
            </Link>
            {event.status !== "draft" && (
              <Link
                href={event.sharePath}
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                Ver link público
              </Link>
            )}
          </div>
        }
      />

      {event.status === "cancelled" && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          Esta convocatoria está cancelada
          {event.cancellationOutcome && `: ${OUTCOME_LABELS[event.cancellationOutcome]}`}.
        </p>
      )}
      {event.status === "closed" && (
        <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
          Las inscripciones están cerradas: ya no se puede editar.
        </p>
      )}

      {(event.status === "draft" || event.status === "published" || event.status === "full") && (
        <EditEventForm
          clubSlug={clubSlug}
          eventId={event.id}
          eventStatus={event.status}
          communities={event.club.communities}
          minDate={todayInLima()}
          confirmedCount={event.confirmedCount}
          defaults={{
            communityId: event.communityId,
            title: event.title,
            date,
            time,
            endTime,
            venueName: event.venueName,
            mapsUrl: event.mapsUrl ?? "",
            price: centsToSolesText(event.priceCents),
            capacity: String(event.capacity),
            isMixed: event.isMixed,
            showRoster: event.showRoster ?? false,
            rules: event.rules ?? "",
          }}
        />
      )}
      {event.status !== "cancelled" && <CancelEventForm clubSlug={clubSlug} eventId={event.id} />}
    </div>
  );
}
