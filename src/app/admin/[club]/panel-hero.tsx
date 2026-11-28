import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClubLogo } from "@/components/club-logo";
import { heroBackground } from "@/components/page-heading";
import { VolleyballIcon } from "@/components/volleyball";
import { cn } from "@/lib/utils";

/** Tiles under the hero's title share one height, so the hero always ends level with the logo. */
export const HERO_TILE_CLASS = "flex h-[2.625rem] rounded-xl bg-white/12 px-3 backdrop-blur-sm";

export const HERO_TITLE_CLASS = "truncate text-2xl leading-tight font-extrabold tracking-tight";

/** The club panel's hero: title and tiles on the left (children), the club logo on the right. */
export function PanelHero({
  club,
  className,
  children,
}: {
  club: { name: string; logoSrc: string | null; primaryColor: string | null };
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
        <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
        <ClubLogo
          name={club.name}
          src={club.logoSrc}
          className="size-20 shrink-0 ring-4 ring-white/30"
        />
      </div>
    </section>
  );
}

/**
 * What a panel page shows under the shared hero: a link back (the event, the store), its own
 * title when it is about one thing (a product, a player), a short explanation and extra links.
 */
export function PanelIntro({
  eyebrow,
  eyebrowHref,
  title,
  children,
  footer,
}: {
  eyebrow?: string;
  eyebrowHref?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!(eyebrowHref && eyebrow) && !title && !children && !footer) return null;
  return (
    <div className="flex flex-col gap-1">
      {eyebrowHref && eyebrow && (
        <Link
          href={eyebrowHref}
          className="group flex w-fit items-center gap-2 py-1 text-sm font-semibold text-primary"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/15">
            <ArrowLeft
              className="size-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden
            />
          </span>
          {eyebrow}
        </Link>
      )}
      {title && <h2 className="text-lg font-semibold first-letter:uppercase">{title}</h2>}
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
      {/* The links were styled for the blue hero; here they take the app's blue. */}
      {footer && <div className="text-sm [&_a]:text-primary">{footer}</div>}
    </div>
  );
}
