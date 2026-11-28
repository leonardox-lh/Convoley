import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { Suspense } from "react";
import { Logo } from "@/components/logo";

/** Header shared by every admin page: home on the left, back to the club panel on the right. */
export default function ClubAdminLayout({ children, params }: LayoutProps<"/admin/[club]">) {
  return (
    <>
      <header
        data-site-header
        data-has-back
        className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 py-3 pr-4 pl-2">
          <div className="flex items-center gap-1">
            <BackButton />
            <Link href="/" aria-label="Convoley, inicio">
              <Logo />
            </Link>
          </div>
          <Suspense>
            <PanelLink params={params} />
          </Suspense>
        </div>
      </header>
      <div className="admin-shell contents">{children}</div>
    </>
  );
}

async function PanelLink({ params }: Pick<LayoutProps<"/admin/[club]">, "params">) {
  return (
    <Link
      href={`/admin/${(await params).club}`}
      data-header-pill
      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm ring-1 ring-border transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <LayoutGrid className="size-4" aria-hidden />
      Mi club
    </Link>
  );
}
