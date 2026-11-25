import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listClubMembers } from "@/modules/clubs";
import { CLUB_ROLE_LABELS } from "../../../club-roles";
import { requireOrganizer } from "../require-organizer";
import { InviteForm, RemoveMemberForm } from "./member-forms";

type Props = PageProps<"/admin/[club]/organizadores">;

export default function OrganizersPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <OrganizersContent params={params} />
      </Suspense>
    </main>
  );
}

async function OrganizersContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const members = await listClubMembers(clubSlug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/${clubSlug}`} className="text-sm text-zinc-500 underline">
          Volver al club
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Organizadores</h1>
        <p className="text-sm text-zinc-500">
          Invita a quien te ayuda sin darle tu cuenta. El ayudante no ve cobros ni finanzas.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {members.map((member) => (
          <li key={member.userId} className="flex items-start justify-between gap-3 py-3">
            <div className="flex flex-col">
              <span className="font-medium">{member.name ?? member.email}</span>
              <span className="text-sm text-zinc-500">{CLUB_ROLE_LABELS[member.role]}</span>
            </div>
            <RemoveMemberForm clubSlug={clubSlug} userId={member.userId} />
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Invitar</h2>
        <InviteForm clubSlug={clubSlug} />
      </section>
    </div>
  );
}
