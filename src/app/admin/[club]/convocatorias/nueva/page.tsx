import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { todayInLima } from "@/lib/lima-time";
import { findClubBySlug } from "@/modules/clubs";
import { CreateEventForm } from "./create-event-form";
import { requireOrganizer } from "../../require-organizer";

type Params = PageProps<"/admin/[club]/convocatorias/nueva">["params"];

export default function NewEventPage({ params }: PageProps<"/admin/[club]/convocatorias/nueva">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <NewEventContent params={params} />
      </Suspense>
    </main>
  );
}

async function NewEventContent({ params }: { params: Params }) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug))) notFound();
  const club = await findClubBySlug(clubSlug);
  if (!club) notFound();

  return (
    <>
      <Link
        href={`/admin/${club.slug}/perfil`}
        className="text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        {club.name} · Perfil del club
      </Link>
      {" · "}
      <Link
        href={`/admin/${club.slug}/comunidades`}
        className="text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        Comunidades
      </Link>
      {" · "}
      <Link
        href={`/admin/${club.slug}/pagos`}
        className="text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        Cobros
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nueva convocatoria</h1>
      <CreateEventForm
        clubSlug={club.slug}
        communities={club.communities}
        minDate={todayInLima()}
      />
    </>
  );
}
