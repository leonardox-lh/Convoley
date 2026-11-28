import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubLogo } from "@/components/club-logo";
import { heroBackground } from "@/components/page-heading";
import { VolleyballIcon } from "@/components/volleyball";
import { cn } from "@/lib/utils";
import { clubLogoPath, getClubProfile } from "@/modules/clubs";

/** Tiles under the hero's title share one height, so every panel hero ends level with the logo. */
export const HERO_TILE_CLASS = "flex h-[2.625rem] rounded-xl bg-white/12 px-3 backdrop-blur-sm";

const HERO_TITLE_CLASS = "truncate text-2xl leading-tight font-extrabold tracking-tight";

/**
 * The club panel's hero: a title, a row of tiles under it and the club logo on the right. Every
 * panel page uses it, so they all keep the same height and look.
 */
export function PanelHero({
  club,
  heading,
  className,
  children,
}: {
  club: { name: string; logoKey: string | null; primaryColor: string | null };
  heading: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-club-hero
      className={cn(
        "relative overflow-hidden rounded-b-[2rem] px-5 pt-17 pb-5 text-white shadow-lg sm:rounded-3xl sm:p-5",
        className,
      )}
      style={heroBackground(club.primaryColor)}
    >
      <VolleyballIcon className="pointer-events-none absolute -top-12 -right-12 size-44 opacity-15" />
      <div className="relative flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {heading}
          {children}
        </div>
        <ClubLogo
          name={club.name}
          src={club.logoKey ? clubLogoPath(club.logoKey) : null}
          className="size-20 shrink-0 ring-4 ring-white/30"
        />
      </div>
    </section>
  );
}

export function PanelHeroTitle({ children }: { children: React.ReactNode }) {
  return <h1 className={HERO_TITLE_CLASS}>{children}</h1>;
}

/**
 * Heading of a panel page: "Panel del club" (or a link back, e.g. to the event) over one tile
 * with the section's icon and name. The explanation and links go under the hero, so it never
 * grows.
 */
export async function PanelHeading({
  clubSlug,
  icon: Icon,
  title,
  eyebrow,
  eyebrowHref,
  children,
  footer,
}: {
  clubSlug: string;
  icon: LucideIcon;
  title: React.ReactNode;
  /** With eyebrowHref, replaces "Panel del club" with a link back (the event, the store). */
  eyebrow?: string;
  eyebrowHref?: string;
  /** One short explanation, under the hero. */
  children?: React.ReactNode;
  /** Extra links, under the hero. */
  footer?: React.ReactNode;
}) {
  const club = await getClubProfile(clubSlug);
  if (!club) notFound();
  return (
    <>
      <PanelHero
        club={club}
        className="-mx-4 -mt-4 sm:mx-0 sm:mt-0"
        heading={
          eyebrowHref && eyebrow ? (
            <Link href={eyebrowHref} className={cn(HERO_TITLE_CLASS, "hover:underline")}>
              {eyebrow}
            </Link>
          ) : (
            <p className={HERO_TITLE_CLASS}>Panel del club</p>
          )
        }
      >
        <div className={cn(HERO_TILE_CLASS, "items-center gap-2")}>
          <Icon className="size-5 shrink-0" aria-hidden />
          <h1 className="line-clamp-2 text-sm leading-[1.1rem] font-bold first-letter:uppercase">
            {title}
          </h1>
        </div>
      </PanelHero>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {/* The links were styled for the blue hero; under it they take the app's blue. */}
      {footer && <div className="text-sm [&_a]:text-primary">{footer}</div>}
    </>
  );
}
