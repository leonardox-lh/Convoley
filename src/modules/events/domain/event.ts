import {
  EventInPastError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidPriceError,
} from "./errors";

export const EVENT_STATUSES = ["draft", "published", "full", "closed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
/** A new event is either saved as a draft or published right away. */
export type InitialEventStatus = Extract<EventStatus, "draft" | "published">;

// Google Maps share links: hosts that only serve Maps, and hosts where Maps lives under /maps.
const MAPS_ONLY_HOSTS = ["maps.google.com", "maps.app.goo.gl"];
const SHARED_HOSTS = ["google.com", "www.google.com", "goo.gl"];

export interface NewEventProps {
  clubId: string;
  communityId: string;
  title: string;
  startsAt: Date;
  venueName: string;
  mapsUrl: string | null;
  priceCents: number;
  capacity: number;
  isMixed: boolean;
  rules: string | null;
  status: InitialEventStatus;
}

/** A validated event ready to be saved (convocatoria). */
export type NewEvent = Readonly<NewEventProps>;

export function newEvent(props: NewEventProps, now: Date): NewEvent {
  if (props.startsAt.getTime() <= now.getTime()) throw new EventInPastError(props.startsAt);
  if (!Number.isInteger(props.capacity) || props.capacity <= 0) {
    throw new InvalidCapacityError(props.capacity);
  }
  if (!Number.isInteger(props.priceCents) || props.priceCents < 0) {
    throw new InvalidPriceError(props.priceCents);
  }
  if (props.mapsUrl !== null && !isGoogleMapsUrl(props.mapsUrl)) {
    throw new InvalidMapsUrlError(props.mapsUrl);
  }
  return { ...props };
}

function isGoogleMapsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (MAPS_ONLY_HOSTS.includes(url.hostname)) return true;
  return SHARED_HOSTS.includes(url.hostname) && url.pathname.startsWith("/maps");
}

/** Path of the public event page that the organizer shares on WhatsApp. */
export function eventSharePath(clubSlug: string, eventId: string): string {
  return `/c/${clubSlug}/${eventId}`;
}
