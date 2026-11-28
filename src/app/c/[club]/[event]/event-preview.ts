import { cache } from "react";
import { formatEventTimeInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { getPublicEvent, type EventCategory, type EventStatus } from "@/modules/events";
import { countConfirmedRegistrations, seatSummary } from "@/modules/registrations";
import { EVENT_CATEGORY_LABELS } from "../../../event-category";

/** The public event plus its free seats; metadata, OG image and page share one read. */
export const loadEventPreview = cache(async (clubSlug: string, eventId: string) => {
  const event = await getPublicEvent({ clubSlug, eventId });
  if (!event) return null;
  const confirmed = await countConfirmedRegistrations(event.id);
  return { ...event, freeSeats: seatSummary(event.capacity, confirmed).free };
});

export function seatsText(event: { status: EventStatus; freeSeats: number }): string {
  if (event.status === "cancelled") return "Cancelada";
  if (event.status === "closed") return "Inscripciones cerradas";
  if (event.freeSeats === 0) return "Llena · lista de espera abierta";
  return event.freeSeats === 1 ? "¡Queda 1 cupo!" : `${event.freeSeats} cupos libres`;
}

/** One line for the link preview: when, who plays (category and level), where, price and seats. */
export function shareDescription(event: {
  startsAt: Date;
  endsAt?: Date | null;
  category: EventCategory;
  communityName: string;
  venueName: string;
  priceCents: number;
  status: EventStatus;
  freeSeats: number;
}): string {
  const when = formatEventTimeInLima(event);
  return [
    when.charAt(0).toUpperCase() + when.slice(1),
    EVENT_CATEGORY_LABELS[event.category],
    event.communityName,
    event.venueName,
    formatSoles(event.priceCents),
    seatsText(event),
  ].join(" · ");
}
