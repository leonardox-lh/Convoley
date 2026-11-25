import { CalendarPlus } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { todayInLima } from "@/lib/lima-time";
import { findClubBySlug } from "@/modules/clubs";
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
    <>
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-semibold tracking-tight">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <CalendarPlus className="size-5" aria-hidden />
        </span>
        Nueva convocatoria
      </h1>
      <CreateEventForm
        clubSlug={club.slug}
        communities={club.communities}
        minDate={todayInLima()}
      />
    </>
  );
}
