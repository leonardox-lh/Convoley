import { PageHeading } from "@/components/page-heading";
import { CalendarPlus } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { defaultEventDateInLima, todayInLima } from "@/lib/lima-time";
import { findClubBySlug } from "@/modules/clubs";
import { listClubVenues } from "@/modules/events";
import { CreateEventForm } from "./create-event-form";
import { requireOrganizer } from "../../require-organizer";

type Params = PageProps<"/admin/[club]/convocatorias/nueva">["params"];

export default function NewEventPage({ params }: PageProps<"/admin/[club]/convocatorias/nueva">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <NewEventContent params={params} />
      </Suspense>
    </main>
  );
}

async function NewEventContent({ params }: { params: Params }) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={CalendarPlus} eyebrow="Gestiona tu club" title="Nueva convocatoria" />
      <CreateEventForm
        clubSlug={club.slug}
        communities={club.communities}
        minDate={todayInLima()}
        defaultDate={defaultEventDateInLima()}
        savedVenues={await listClubVenues(club.slug)}
      />
    </div>
  );
}
