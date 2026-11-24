import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listCommunities } from "@/modules/clubs";
import { requireOrganizer } from "../require-organizer";
import { CommunityRow, NewCommunityForm } from "./community-forms";

type Props = PageProps<"/admin/[club]/comunidades">;

export default function CommunitiesPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <CommunitiesContent params={params} />
      </Suspense>
    </main>
  );
}

async function CommunitiesContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if ((await requireOrganizer(clubSlug))?.role !== "admin") notFound();
  const communities = await listCommunities(clubSlug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/admin/${clubSlug}/convocatorias/nueva`}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          Nueva convocatoria
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Comunidades</h1>
        <p className="text-sm text-zinc-500">
          Separa tus convocatorias como en tus grupos de WhatsApp: General, Amateur, Competitivo…
        </p>
      </div>
      <NewCommunityForm clubSlug={clubSlug} />
      <ul
        aria-label="Comunidades"
        className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
      >
        {communities.map((community) => (
          <CommunityRow key={community.id} clubSlug={clubSlug} {...community} />
        ))}
      </ul>
    </div>
  );
}
