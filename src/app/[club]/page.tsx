import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { clubLogoPath, getClubProfile } from "@/modules/clubs";

const LOGO_PX = 96;

type Params = PageProps<"/[club]">["params"];

/** convoley.pe/<club>: the club's profile. HU-03 adds its open events. */
export default function PublicClubPage({ params }: PageProps<"/[club]">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1">
      <Suspense fallback={<p className="px-4 py-8 text-sm text-zinc-500">Cargando…</p>}>
        <PublicClubContent params={params} />
      </Suspense>
    </main>
  );
}

async function PublicClubContent({ params }: { params: Params }) {
  const club = await getClubProfile((await params).club);
  if (!club) notFound();

  return (
    <>
      <header
        className="flex flex-col items-center gap-3 px-4 py-8 text-center text-white"
        style={{ backgroundColor: club.primaryColor ?? undefined }}
      >
        {club.logoKey && (
          <Image
            src={clubLogoPath(club.logoKey)}
            alt={`Logo de ${club.name}`}
            width={LOGO_PX}
            height={LOGO_PX}
            unoptimized
            className="size-24 rounded-full bg-white object-cover"
          />
        )}
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: club.secondaryColor ?? undefined }}
        >
          {club.name}
        </h1>
      </header>
      <section className="flex flex-col gap-3 px-4 py-6">
        {club.description && <p className="whitespace-pre-line">{club.description}</p>}
        <div className="flex gap-4 text-sm font-medium">
          {club.instagramUrl && (
            <a
              href={club.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Instagram
            </a>
          )}
          {club.tiktokUrl && (
            <a
              href={club.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              TikTok
            </a>
          )}
        </div>
      </section>
    </>
  );
}
