import { type EventDetailsProps, validateEventDetails } from "./event";
import { InvalidRecurrenceError } from "./errors";

// Lima is UTC-05:00 all year (no DST), so a fixed offset is exact. Domain code can't use lib/.
export const LIMA_UTC_OFFSET_MINUTES = -5 * 60;
export const MAX_PUBLISH_DAYS_BEFORE = 13;
const DAYS_PER_WEEK = 7;
const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;
const MS_PER_WEEK = DAYS_PER_WEEK * MS_PER_DAY;
const OFFSET_MS = LIMA_UTC_OFFSET_MINUTES * MS_PER_MINUTE;

/** HU-28: a weekly event, "todos los martes 8 p. m.", published some days before each date. */
export interface RecurrenceProps extends Omit<EventDetailsProps, "startsAt" | "endsAt"> {
  /** 0 = Sunday … 6 = Saturday, in Lima. */
  weekday: number;
  /** Minutes after 00:00 in Lima. */
  startMinute: number;
  /** Minutes after 00:00 in Lima, same day; null on templates created before end times existed. */
  endMinute?: number | null;
  publishDaysBefore: number;
}

const isIntBetween = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

export function validateRecurrence(props: RecurrenceProps, now: Date): void {
  if (!isIntBetween(props.weekday, 0, DAYS_PER_WEEK - 1)) throw new InvalidRecurrenceError();
  if (!isIntBetween(props.startMinute, 0, MINUTES_PER_DAY - 1)) throw new InvalidRecurrenceError();
  if (!isIntBetween(props.publishDaysBefore, 0, MAX_PUBLISH_DAYS_BEFORE)) {
    throw new InvalidRecurrenceError();
  }
  // Same rules as a single event (price, capacity, Maps link, end after start) on its next date.
  const startsAt = nextOccurrence(props, now);
  validateEventDetails({ ...props, startsAt, endsAt: occurrenceEndsAt(props, startsAt) }, now);
}

/** When a date of the schedule ends: same length as the template's start-to-end span. */
export function occurrenceEndsAt(
  schedule: Pick<RecurrenceProps, "startMinute" | "endMinute">,
  startsAt: Date,
): Date | null {
  if (schedule.endMinute == null) return null;
  return new Date(startsAt.getTime() + (schedule.endMinute - schedule.startMinute) * MS_PER_MINUTE);
}

/** The first date of the schedule strictly after `after`. */
export function nextOccurrence(
  schedule: Pick<RecurrenceProps, "weekday" | "startMinute">,
  after: Date,
): Date {
  // Shift to Lima wall-clock time so the UTC getters read Lima's day and weekday.
  const lima = new Date(after.getTime() + OFFSET_MS);
  const limaMidnight = Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate());
  const daysAhead = (schedule.weekday - lima.getUTCDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const candidate =
    limaMidnight + daysAhead * MS_PER_DAY + schedule.startMinute * MS_PER_MINUTE - OFFSET_MS;
  return new Date(candidate > after.getTime() ? candidate : candidate + MS_PER_WEEK);
}

/** 00:00 in Lima of the day `date` falls on, as a UTC instant. */
function limaMidnight(date: Date): number {
  const lima = date.getTime() + OFFSET_MS;
  return lima - (lima % MS_PER_DAY) - OFFSET_MS;
}

/**
 * Dates that should exist by now: in the future and already inside their publishing window,
 * counted in Lima calendar days (0 = from 00:00 of the same day). With at most 13 days ahead
 * there are never more than two.
 */
export function dueOccurrences(
  template: Pick<RecurrenceProps, "weekday" | "startMinute" | "publishDaysBefore"> & {
    isPaused: boolean;
  },
  now: Date,
): Date[] {
  if (template.isPaused) return [];
  const first = nextOccurrence(template, now);
  const publishWindowMs = template.publishDaysBefore * MS_PER_DAY;
  return [first, new Date(first.getTime() + MS_PER_WEEK)].filter(
    (slot) => limaMidnight(slot) - publishWindowMs <= now.getTime(),
  );
}
