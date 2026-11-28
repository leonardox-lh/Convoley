import { notFound } from "next/navigation";
import { Suspense } from "react";
import { can } from "@/modules/clubs";
import { ClubTabs } from "../../../[club]/club-tabs";
import { requireOrganizer } from "../require-organizer";

/**
 * Mi club, Tienda and Planes of the club panel: under the shared hero (admin layout), folder tabs
 * stay put while only the panel below loads (loading.tsx), like the public club pages.
 */
export default function ClubPanelLayout({ children, params }: LayoutProps<"/admin/[club]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-3 pb-8">
      <Suspense>
        <PanelTabs params={params} />
      </Suspense>
      <div className="flex-1 pt-5 sm:rounded-2xl sm:rounded-tl-none sm:border sm:bg-card sm:p-4 sm:shadow-sm">
        {children}
      </div>
    </main>
  );
}

/** Helpers can't open Tienda or Planes, so they get no tabs. */
async function PanelTabs({ params }: Pick<LayoutProps<"/admin/[club]">, "params">) {
  const clubSlug = (await params).club;
  const organizer = await requireOrganizer(clubSlug, "run_game_day");
  if (!organizer) notFound();
  return can(organizer.role, "manage_club") ? <ClubTabs slug={clubSlug} admin /> : null;
}
