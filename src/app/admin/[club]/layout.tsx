import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { heroBackground } from "@/components/page-heading";
import { cn } from "@/lib/utils";
import { clubLogoPath, getClubProfile } from "@/modules/clubs";
import { listOpenEvents } from "@/modules/events";
import { ProfileButton } from "../../profile-button";
import { HERO_TILE_CLASS, PanelHero } from "./panel-hero";
import { PanelHeroBody } from "./panel-hero-body";
import { requireOrganizer } from "./require-organizer";

const HERO_MARGINS = "-mx-4 -mt-4 sm:mx-0 sm:mt-0";

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
          <div className="flex items-center gap-2">
            <Suspense>
              <PanelLink params={params} />
            </Suspense>
            <Suspense>
              <ProfileButton myClub={false} />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="admin-shell contents">
        {/* Outside the pages, so moving between them never reloads it: only its tile changes. */}
        <div className="mx-auto w-full max-w-md px-4 pt-4 pb-2">
          <Suspense fallback={<PanelHeroPlaceholder />}>
            <SharedPanelHero params={params} />
          </Suspense>
        </div>
        {children}
      </div>
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

async function SharedPanelHero({ params }: Pick<LayoutProps<"/admin/[club]">, "params">) {
  const clubSlug = (await params).club;
  // Pages answer "not found" themselves; the hero just stays out of the way.
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) return <PanelHeroPlaceholder />;
  const [club, events] = await Promise.all([getClubProfile(clubSlug), listOpenEvents(clubSlug)]);
  if (!club || !events) return <PanelHeroPlaceholder />;
  const freeSpots = events.reduce((total, event) => total + event.remainingSpots, 0);
  return (
    <PanelHero
      club={{
        name: club.name,
        logoSrc: club.logoKey ? clubLogoPath(club.logoKey) : null,
        primaryColor: club.primaryColor,
      }}
      className={HERO_MARGINS}
    >
      <PanelHeroBody
        stats={
          <dl className="grid grid-cols-2 gap-2">
            <Stat label="Convocatorias" value={events.length} />
            <Stat label="Cupos libres" value={freeSpots} />
          </dl>
        }
      />
    </PanelHero>
  );
}

/** Same size as the hero, so nothing jumps when it arrives. */
function PanelHeroPlaceholder() {
  return (
    <div
      data-club-hero
      aria-hidden
      className={cn(HERO_MARGINS, "h-42 rounded-b-[2rem] shadow-lg sm:h-30 sm:rounded-3xl")}
      style={heroBackground(null)}
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn(HERO_TILE_CLASS, "flex-col justify-center")}>
      <dt className="text-[11px] leading-3.5 text-white/75">{label}</dt>
      <dd className="text-lg leading-5 font-extrabold">{value}</dd>
    </div>
  );
}
