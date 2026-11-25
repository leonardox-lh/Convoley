import {
  CapacityBelowConfirmedError,
  EventAlreadyCancelledError,
  EventInPastError,
  EventNotEditableError,
  InvalidCapacityError,
  InvalidCourtCostError,
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

/** Statuses shown on the club's public page: players can still sign up or see it is full. */
export const LISTED_STATUSES: readonly EventStatus[] = ["published", "full"];

/** Statuses whose details the organizer can still change. */
const EDITABLE_STATUSES: readonly EventStatus[] = ["draft", "published", "full"];

// Same values as payments/domain/payment.ts (domain code can't import other modules); keep in sync.
export const CANCELLATION_OUTCOMES = ["refund", "balance"] as const;
/** What happens with players' payments when the event is cancelled. */
export type CancellationOutcome = (typeof CANCELLATION_OUTCOMES)[number];

/** The details an organizer types in, both when creating and when editing. */
export interface EventDetailsProps {
  communityId: string;
  title: string;
  startsAt: Date;
  venueName: string;
  mapsUrl: string | null;
  priceCents: number;
  capacity: number;
  isMixed: boolean;
  rules: string | null;
}

export interface NewEventProps extends EventDetailsProps {
  clubId: string;
  status: InitialEventStatus;
}

/** A validated event ready to be saved (convocatoria). */
export type NewEvent = Readonly<NewEventProps>;

export function newEvent(props: NewEventProps, now: Date): NewEvent {
  validateEventDetails(props, now);
  return { ...props };
}

export function validateEventDetails(props: EventDetailsProps, now: Date): void {
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
}

/** HU-34: what the court cost, in cents; null clears it. */
export function validateCourtCost(courtCostCents: number | null): void {
  if (courtCostCents === null) return;
  if (!Number.isInteger(courtCostCents) || courtCostCents < 0) {
    throw new InvalidCourtCostError(courtCostCents);
  }
}

export function assertEditable(status: EventStatus): void {
  if (!EDITABLE_STATUSES.includes(status)) throw new EventNotEditableError(status);
}

export function assertCancellable(status: EventStatus): void {
  if (status === "cancelled") throw new EventAlreadyCancelledError();
}

/** Capacity can't drop below the players already holding a spot. */
export function assertCapacityCoversConfirmed(capacity: number, confirmed: number): void {
  if (capacity < confirmed) throw new CapacityBelowConfirmedError(capacity, confirmed);
}

/** Spots still free; never negative even if registrations outgrew a reduced capacity. */
export function remainingSpots(capacity: number, confirmed: number): number {
  return Math.max(0, capacity - confirmed);
}

/** An open event becomes full when every spot is taken, and reopens when spots are added. */
export function statusAfterCapacityChange(
  status: EventStatus,
  capacity: number,
  confirmed: number,
): EventStatus {
  if (status !== "published" && status !== "full") return status;
  return confirmed >= capacity ? "full" : "published";
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
