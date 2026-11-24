import { notFound } from "next/navigation";
import { Suspense } from "react";
import { todayInLima } from "@/lib/lima-time";
import { findClubBySlug } from "@/modules/clubs";
import { CreateEventForm } from "./create-event-form";
import { isEventCreationEnabled } from "./organizer-access";

type Params = PageProps<"/admin/[club]/convocatorias/nueva">["params"];

export default function NewEventPage({ params }: PageProps<"/admin/[club]/convocatorias/nueva">) {
  if (!isEventCreationEnabled()) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <NewEventContent params={params} />
      </Suspense>
    </main>
  );
}

async function NewEventContent({ params }: { params: Params }) {
  const club = await findClubBySlug((await params).club);
  if (!club) notFound();

  return (
    <>
      <p className="text-sm text-zinc-500">{club.name}</p>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nueva convocatoria</h1>
      <CreateEventForm
        clubSlug={club.slug}
        communities={club.communities}
        minDate={todayInLima()}
      />
    </>
  );
}
