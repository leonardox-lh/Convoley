import { ClubLogo } from "@/components/club-logo";
import { PageHeading } from "@/components/page-heading";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { FormMessage } from "@/components/form";
import { appUrl } from "@/lib/app-url";
import { clubLogoPath, getClubProfile, MAX_LOGO_BYTES } from "@/modules/clubs";
import { ClubProfileForm } from "@/app/club/club-profile-form";
import { requireOrganizer } from "../require-organizer";
import { updateClubProfileAction } from "./actions";

type Props = PageProps<"/admin/[club]/perfil">;

export default function ClubProfilePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <ClubProfileContent {...props} />
      </Suspense>
    </main>
  );
}

async function ClubProfileContent({ params, searchParams }: Props) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const club = await getClubProfile(clubSlug);
  if (!club) notFound();
  const query = await searchParams;
  const publicUrl = `${await appUrl()}/${club.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={club.name}
        title="Perfil del club"
        media={
          <ClubLogo
            name={club.name}
            src={club.logoKey ? clubLogoPath(club.logoKey) : null}
            className="size-14 rounded-xl"
          />
        }
      />
      {query.creado && <FormMessage tone="ok">¡Tu club está listo!</FormMessage>}
      {query.guardado && <FormMessage tone="ok">Cambios guardados.</FormMessage>}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Link de tu club</p>
        <div className="flex items-center gap-1">
          <a
            href={publicUrl}
            className="min-w-0 flex-1 text-sm break-all text-primary underline-offset-4 hover:underline"
          >
            {publicUrl}
          </a>
          <CopyButton text={publicUrl} label="Copiar link del club" />
        </div>
      </div>
      <ClubProfileForm
        action={updateClubProfileAction}
        maxLogoBytes={MAX_LOGO_BYTES}
        submitLabel="Guardar cambios"
        logoUrl={club.logoKey ? clubLogoPath(club.logoKey) : undefined}
        clubSlug={club.slug}
        defaults={club}
      />
    </div>
  );
}
