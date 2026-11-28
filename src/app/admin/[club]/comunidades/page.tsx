import { PageHeading } from "@/components/page-heading";
import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listCommunities } from "@/modules/clubs";
import { requireOrganizer } from "../require-organizer";
import { CommunityRow, NewCommunityForm } from "./community-forms";

type Props = PageProps<"/admin/[club]/comunidades">;

export default function CommunitiesPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <CommunitiesContent params={params} />
      </Suspense>
    </main>
  );
}

async function CommunitiesContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const communities = await listCommunities(clubSlug);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={Users} eyebrow="Gestiona tu club" title="Comunidades">
        Configura los niveles que ofrece tu club: Básico, Intermedio, Avanzado…
      </PageHeading>
      <NewCommunityForm clubSlug={clubSlug} />
      <ul
        aria-label="Comunidades"
        className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800"
      >
        {communities.map((community) => (
          <CommunityRow
            key={community.id}
            clubSlug={clubSlug}
            isLast={communities.length === 1}
            {...community}
          />
        ))}
      </ul>
    </div>
  );
}
