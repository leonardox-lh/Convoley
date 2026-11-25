import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { can } from "@/modules/clubs";
import { AdminTabs } from "./admin-tabs";
import { requireOrganizer } from "./require-organizer";

/** Header shared by every admin page: home on the left, back to the club panel on the right. */
export default function ClubAdminLayout({ children, params }: LayoutProps<"/admin/[club]">) {
  return (
    <>
      <header data-site-header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Convoley, inicio">
            <Logo />
          </Link>
          <Suspense>
            <PanelLink params={params} />
          </Suspense>
        </div>
        <Suspense>
          <AdminTabsFor params={params} />
        </Suspense>
      </header>
      <div className="admin-shell contents">{children}</div>
    </>
  );
}

/** Only members who manage the club get the tabs: helpers can't open those pages. */
async function AdminTabsFor({ params }: Pick<LayoutProps<"/admin/[club]">, "params">) {
  const clubSlug = (await params).club;
  const organizer = await requireOrganizer(clubSlug, "run_game_day");
  if (!organizer || !can(organizer.role, "manage_club")) return null;
  return <AdminTabs clubSlug={clubSlug} />;
}

async function PanelLink({ params }: Pick<LayoutProps<"/admin/[club]">, "params">) {
  return (
    <Link
      href={`/admin/${(await params).club}`}
      className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <LayoutGrid className="size-4" aria-hidden />
      Mi club
    </Link>
  );
}
