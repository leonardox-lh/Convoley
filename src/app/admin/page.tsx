import { redirect } from "next/navigation";
import { Suspense } from "react";
import { findFirstClubSlugForMember } from "@/modules/clubs";
import { currentUserId, SIGN_IN_PATH } from "@/modules/identity";

/** Landing after sign-in: your club if you have one, otherwise create it. */
export default function AdminHomePage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <RedirectToClub />
      </Suspense>
    </main>
  );
}

async function RedirectToClub(): Promise<never> {
  const userId = await currentUserId();
  if (!userId) redirect(SIGN_IN_PATH);
  // shortcut: with several clubs this opens the oldest one; replace with a club picker /
  // home that lists them all.
  const clubSlug = await findFirstClubSlugForMember(userId);
  redirect(clubSlug ? `/admin/${clubSlug}` : "/club/nuevo");
}
