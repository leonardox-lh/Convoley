import { Clock, MapIcon, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClubLogo } from "@/components/club-logo";
import { buttonVariants } from "@/components/ui/button";
import { heroBackground } from "@/components/page-heading";
import { VolleyballIcon } from "@/components/volleyball";
import { cn } from "@/lib/utils";
import { formatTimeInLima, limaDateParts } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import type { EventCategory } from "@/modules/events";
import { EVENT_CATEGORY_LABELS, EventCategoryIcon } from "./event-category";

export interface EventHeroData {
  clubName: string;
  /** Public logo URL, or null for the initial. */
  logoSrc: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  title: string;
  communityName: string;
  category: EventCategory;
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
  /** Shown under the title, e.g. the "Link convocatoria" button. */
  action?: ReactNode;
  /** The seats badge or text on the right of the price. */
  seats: ReactNode;
  showSeatsBar: boolean;
  /** Organizer's view: a pencil to edit the event, at the right of its date and time. */
  editHref?: string;
  /**
   * "card": no colored hero (the club panel's header sits above); the title, chips and action
   * open the details card instead.
   */
  variant?: "hero" | "card";
}) {
  const { event } = props;
  const date = limaDateParts(event.startsAt);
  const time = event.endsAt
    ? `${formatTimeInLima(event.startsAt)} – ${formatTimeInLima(event.endsAt)}`
    : formatTimeInLima(event.startsAt);

  const clubLine = (
    <>
      <ClubLogo name={event.clubName} src={event.logoSrc} className="size-12 rounded-xl" />
      {/* "/ Convocatoria" never splits: a long club name pushes it whole to the second line. */}
      <span className="line-clamp-2 min-w-0 text-lg leading-tight font-bold tracking-wide uppercase">
        <span style={{ color: event.secondaryColor ?? undefined }}>{event.clubName}</span>
        {props.clubSuffix && (
          <span className="whitespace-nowrap text-white/70"> / {props.clubSuffix}</span>
        )}
      </span>
    </>
  );

  const isCard = props.variant === "card";
  const chips = (
    <>
      <span className="rounded-full bg-white/15 px-3 py-1">{event.communityName}</span>
      <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
        <EventCategoryIcon category={event.category} />
        {EVENT_CATEGORY_LABELS[event.category]}
      </span>
    </>
  );

  return (
    <>
      {!isCard && (
        /* data-club-hero: on phones the color runs up under the see-through top bar (globals.css). */
        <header
          data-club-hero
          className="relative -mx-4 overflow-hidden rounded-b-[2rem] px-5 pt-6 pb-14 text-white max-sm:pt-17"
          style={heroBackground(event.primaryColor)}
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
          <div className="relative mt-3 flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
              <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance first-letter:uppercase">
                {event.title}
              </h1>
              {props.action}
            </div>
            <div className="mt-2 flex shrink-0 flex-col items-end gap-1.5 text-xs font-medium">
              {chips}
            </div>
          </div>
        </header>
      )}

      <section
        aria-label="Detalles de la convocatoria"
        className={cn(
          "relative flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-lg shadow-black/5",
          !isCard && "-mt-12",
        )}
      >
        {isCard && (
          <div className="flex flex-col gap-3 border-b pb-4">
            <div className="flex items-start gap-3">
              <h2 className="min-w-0 flex-1 text-2xl leading-tight font-extrabold tracking-tight text-balance first-letter:uppercase">
                {event.title}
              </h2>
              {/* The hero's white-on-color chips, in the app's light blue on the card. */}
              <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs font-medium text-primary [&>span]:bg-primary/10">
                {chips}
              </div>
            </div>
            {props.action}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl border text-center">
            <span className="w-full bg-primary py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
              {date.month}
            </span>
            <span className="py-1.5 text-2xl leading-none font-extrabold">{date.day}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold capitalize">{date.weekday}</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {time}
            </span>
          </div>
          {props.editHref && (
            <Link
              href={props.editHref}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "shrink-0 gap-1 border-primary text-primary hover:bg-primary/10 hover:text-primary",
              })}
            >
              <Pencil aria-hidden />
              Editar
            </Link>
          )}
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
              <MapIcon aria-hidden />
              Ver en el mapa
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
