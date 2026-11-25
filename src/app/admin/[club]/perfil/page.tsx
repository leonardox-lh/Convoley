import { Store } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { FormMessage } from "@/components/form";
import { appUrl } from "@/lib/app-url";
import { clubLogoPath, getClubProfile, MAX_LOGO_BYTES } from "@/modules/clubs";
import { ClubProfileForm } from "@/app/club/club-profile-form";
import { requireOrganizer } from "../require-organizer";
import { updateClubProfileAction } from "./actions";

const LOGO_PREVIEW_PX = 64;

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
      <div className="flex items-center gap-3">
        {club.logoKey && (
          <Image
            src={clubLogoPath(club.logoKey)}
            alt={`Logo de ${club.name}`}
            width={LOGO_PREVIEW_PX}
            height={LOGO_PREVIEW_PX}
            unoptimized
            className="size-16 rounded-full object-cover"
          />
        )}
        <div>
          <p className="text-sm text-zinc-500">{club.name}</p>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Store className="size-5" aria-hidden />
          </span>
          Perfil del club
        </h1>
        </div>
      </div>
      {query.creado && <FormMessage tone="ok">¡Tu club está listo!</FormMessage>}
      {query.guardado && <FormMessage tone="ok">Cambios guardados.</FormMessage>}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Link de tu club</p>
        <div className="flex items-center gap-1">
          <a href={publicUrl} className="min-w-0 flex-1 text-sm break-all text-primary underline-offset-4 hover:underline">
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
