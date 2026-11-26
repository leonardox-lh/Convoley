import { Clock, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClubLogo } from "@/components/club-logo";
import { buttonVariants } from "@/components/ui/button";
import { VolleyballIcon } from "@/components/volleyball";
import { formatTimeInLima, limaDateParts } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";

// The app's blue when the club has no color of its own; the hero fades into night blue.
const DEFAULT_BRAND_COLOR = "#1d4ed8";
const HERO_NIGHT = "#0a1a4a";

export interface EventHeroData {
  clubName: string;
  /** Public logo URL, or null for the initial. */
  logoSrc: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  title: string;
  communityName: string;
  isMixed: boolean;
  startsAt: Date;
  endsAt?: Date | null;
  venueName: string;
  mapsUrl: string | null;
  priceCents: number;
  capacity: number;
  /** Seats taken; drives the bar. */
  taken: number;
}

/**
 * The event's hero (club, title, chips) and the details card under it (date, place, price,
 * seats), shared by the public page and the organizer's view so both look the same.
 */
export function EventHero(props: {
  event: EventHeroData;
  /** Where the club line goes; plain text when absent. */
  clubHref?: string;
  /** Text after the club name, e.g. "Convocatoria" in the organizer's view. */
  clubSuffix?: string;
  /** Shown on the right of the title, e.g. "Copiar link". */
  action?: ReactNode;
  /** The seats badge or text on the right of the price. */
  seats: ReactNode;
  showSeatsBar: boolean;
}) {
  const { event } = props;
  const date = limaDateParts(event.startsAt);
  const time = event.endsAt
    ? `${formatTimeInLima(event.startsAt)} – ${formatTimeInLima(event.endsAt)}`
    : formatTimeInLima(event.startsAt);
  const brandColor = event.primaryColor ?? DEFAULT_BRAND_COLOR;

  const clubLine = (
    <>
      <ClubLogo name={event.clubName} src={event.logoSrc} className="size-12 rounded-xl" />
      {/* "/ Convocatoria" never splits: a long club name pushes it whole to the second line. */}
      <span className="line-clamp-2 min-w-0 text-sm font-semibold tracking-wide uppercase">
        <span style={{ color: event.secondaryColor ?? undefined }}>{event.clubName}</span>
        {props.clubSuffix && (
          <span className="whitespace-nowrap text-white/70"> / {props.clubSuffix}</span>
        )}
      </span>
    </>
  );

  return (
    <>
      {/* data-club-hero: on phones the color runs up under the see-through top bar (globals.css). */}
      <header
        data-club-hero
        className="relative -mx-4 overflow-hidden rounded-b-[2rem] px-5 pt-6 pb-14 text-white max-sm:pt-20"
        style={{ backgroundImage: `linear-gradient(140deg, ${brandColor} 0%, ${HERO_NIGHT} 100%)` }}
      >
        <VolleyballIcon className="pointer-events-none absolute -top-10 -right-12 size-48 opacity-15" />
        {props.clubHref ? (
          <Link
            href={props.clubHref}
            aria-label={`Ver ${event.clubName}`}
            className="relative flex items-center gap-3"
          >
            {clubLine}
          </Link>
        ) : (
          <div className="relative flex items-center gap-3">{clubLine}</div>
        )}
        <div className="relative mt-5 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-3xl leading-tight font-extrabold tracking-tight text-balance first-letter:uppercase">
            {event.title}
          </h1>
          {props.action}
        </div>
        <div className="relative mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/15 px-3 py-1">{event.communityName}</span>
          {event.isMixed && <span className="rounded-full bg-white/15 px-3 py-1">Mixto</span>}
        </div>
      </header>

      <section
        aria-label="Detalles de la convocatoria"
        className="relative -mt-12 flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-lg shadow-black/5"
      >
        <div className="flex items-center gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl border text-center">
            <span className="w-full bg-primary py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
              {date.month}
            </span>
            <span className="py-1.5 text-2xl leading-none font-extrabold">{date.day}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold capitalize">{date.weekday}</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {time}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 font-medium first-letter:uppercase">
            {event.venueName}
          </span>
          {event.mapsUrl && (
            <a
              href={event.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1" })}
            >
              <Navigation aria-hidden />
              Cómo llegar
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Precio</span>
            <span className="text-2xl font-extrabold tracking-tight">
              {event.priceCents === 0 ? "Gratis" : formatSoles(event.priceCents)}
            </span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-muted-foreground">Cupos</span>
            {props.seats}
          </div>
        </div>
        {props.showSeatsBar && (
          <div
            role="progressbar"
            aria-label="Cupos ocupados"
            aria-valuemin={0}
            aria-valuemax={event.capacity}
            aria-valuenow={event.taken}
            className="-mt-1 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(100, (event.taken / Math.max(event.capacity, 1)) * 100)}%`,
              }}
            />
          </div>
        )}
      </section>
    </>
  );
}
