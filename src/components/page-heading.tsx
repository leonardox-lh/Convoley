import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { VolleyballIcon } from "./volleyball";

// The app's blue when the club has no color of its own; the hero fades into night blue.
const DEFAULT_BRAND_COLOR = "#1d4ed8";
const HERO_NIGHT = "#0a1a4a";

/** The heroes' background: the club color fading into night blue. */
export function heroBackground(primaryColor: string | null) {
  return {
    backgroundImage: `linear-gradient(140deg, ${primaryColor ?? DEFAULT_BRAND_COLOR} 0%, ${HERO_NIGHT} 100%)`,
  };
}

/**
 * Title block of the inner pages, in the same blue hero as the club and event pages. It goes
 * first in a page whose <main> has `px-4 pt-4`: on phones it runs edge to edge and up under the
 * see-through top bar (data-club-hero, globals.css).
 */
export function PageHeading({
  icon: Icon,
  media,
  title,
  eyebrow,
  eyebrowHref,
  primaryColor = null,
  children,
  footer,
}: {
  icon?: LucideIcon;
  /** Shown instead of the icon, e.g. the club logo. */
  media?: React.ReactNode;
  title: React.ReactNode;
  eyebrow?: string;
  /** Makes the eyebrow a link back, e.g. to the club's store. */
  eyebrowHref?: string;
  primaryColor?: string | null;
  /** One short explanation under the title. */
  children?: React.ReactNode;
  /** Extra lines or links at the bottom of the hero. */
  footer?: React.ReactNode;
}) {
  return (
    <header
      data-club-hero
      className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[2rem] px-5 pt-20 pb-6 text-white shadow-lg sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-5"
      style={heroBackground(primaryColor)}
    >
      <VolleyballIcon className="pointer-events-none absolute -top-10 -right-12 size-44 opacity-15" />
      <div className="relative flex items-center gap-3">
        {media ??
          (Icon && (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Icon className="size-6" aria-hidden />
            </span>
          ))}
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow &&
            (eyebrowHref ? (
              <Link
                href={eyebrowHref}
                className="truncate text-xs font-semibold tracking-wide text-white/75 uppercase hover:text-white"
              >
                {eyebrow}
              </Link>
            ) : (
              <p className="truncate text-xs font-semibold tracking-wide text-white/75 uppercase">
                {eyebrow}
              </p>
            ))}
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance first-letter:uppercase">
            {title}
          </h1>
        </div>
      </div>
      {children && <p className="relative mt-3 text-sm text-white/80">{children}</p>}
      {footer && <div className="relative mt-3 text-sm">{footer}</div>}
    </header>
  );
}

/** A block of the page (a form, a list): a title and its content, with no box around it. */
export function SectionCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
