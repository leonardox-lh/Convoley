import { MapPin } from "lucide-react";
import Link from "next/link";
import { ClubLogo } from "@/components/club-logo";
import { formatTimeRangeInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";

/** What one upcoming-event card needs; plain data so the browser can render more pages too. */
export interface UpcomingEventCardData {
  id: string;
  href: string;
  title: string;
  clubName: string;
  clubLogoUrl: string | null;
  startsAt: Date;
  endsAt: Date | null;
  remainingSpots: number;
  venueName: string;
  priceCents: number;
}

export const EVENT_LIST_CLASS = "grid grid-cols-1 gap-3 md:grid-cols-2";

const LIMA = "America/Lima";
const limaDay = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, day: "numeric" });
const limaMonth = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, month: "short" });
const limaWeekday = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long" });

export function UpcomingEventCard({ event }: { event: UpcomingEventCardData }) {
  const isFull = event.remainingSpots === 0;
  return (
    <li className="min-w-0">
      <Link href={event.href} className="card-interactive flex gap-3 p-3">
        <span className="flex w-12 shrink-0 flex-col items-center gap-1.5">
          <ClubLogo
            name={event.clubName}
            src={event.clubLogoUrl}
            className="size-12 rounded-full bg-primary text-lg shadow-sm ring-0"
          />
          <span className="flex w-full flex-col items-center rounded-lg bg-secondary py-1 text-secondary-foreground">
            <span className="text-base leading-none font-semibold">
              {limaDay.format(event.startsAt)}
            </span>
            <span className="text-xs font-medium uppercase">
              {limaMonth.format(event.startsAt).replace(".", "")}
            </span>
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate font-medium">{event.title}</span>
            <span
              className={
                isFull
                  ? "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
              }
            >
              {isFull ? "Llena" : `${event.remainingSpots} cupos`}
            </span>
          </span>
          <span className="truncate text-sm font-medium text-primary">{event.clubName}</span>
          <span className="text-sm text-muted-foreground first-letter:uppercase">
            {limaWeekday.format(event.startsAt)} · {formatTimeRangeInLima(event)}
          </span>
          <span className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{event.venueName}</span>
            </span>
            <span className="shrink-0 font-semibold">{formatSoles(event.priceCents)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
