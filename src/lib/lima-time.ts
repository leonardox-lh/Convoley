// Lima is UTC-05:00 all year (no DST), so a fixed offset is exact.
const LIMA_OFFSET = "-05:00";
const LIMA_TIME_ZONE = "America/Lima";

/** Converts a date ("2026-12-05") and time ("19:00") typed in Lima to a UTC Date. */
export function limaDateTimeToUtc(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${LIMA_OFFSET}`);
}

/** Today's date in Lima as "YYYY-MM-DD", for date inputs. */
export function todayInLima(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LIMA_TIME_ZONE }).format(now);
}

const LATE_HOUR = 21;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Date a new event starts on by default: today in Lima, or tomorrow from 9 p. m. on, when
 * nobody is setting up a game for the same night. Adding the hours left until midnight
 * moves "now" into tomorrow exactly when it's 21:00 or later.
 */
export function defaultEventDateInLima(now = new Date()): string {
  return todayInLima(new Date(now.getTime() + (24 - LATE_HOUR) * MS_PER_HOUR));
}

const limaFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  dateStyle: "full",
  timeStyle: "short",
});

export function formatInLima(date: Date): string {
  return limaFormatter.format(date);
}

const limaTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  timeStyle: "short",
});

/** Only the hour in Lima, like "7:10 p. m.", for deadlines within the same day. */
export function formatTimeInLima(date: Date): string {
  return limaTimeFormatter.format(date);
}

const limaPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Splits a UTC Date into the "YYYY-MM-DD" and "HH:MM" Lima values for date and time inputs. */
export function limaDateAndTime(date: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    limaPartsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

const limaDateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  dateStyle: "long",
});

/** Only the date in Lima, like "25 de noviembre de 2026". */
export function formatDateInLima(date: Date): string {
  return limaDateFormatter.format(date);
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The current month in Lima as "YYYY-MM". */
export function currentLimaMonth(now = new Date()): string {
  return todayInLima(now).slice(0, 7);
}

/** "YYYY-MM" if valid, else the current month in Lima: for `?mes=` query params. */
export function parseLimaMonth(raw: unknown, now = new Date()): string {
  return typeof raw === "string" && MONTH_PATTERN.test(raw) ? raw : currentLimaMonth(now);
}

/** UTC bounds [from, to) of a "YYYY-MM" month in Lima. */
export function limaMonthRange(month: string): { from: Date; to: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  const next =
    monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
  return {
    from: limaDateTimeToUtc(`${month}-01`, "00:00"),
    to: limaDateTimeToUtc(`${next}-01`, "00:00"),
  };
}

/** Day and start time in Lima, plus the end time when the event has one: "…, 7:00 p. m. – 9:00 p. m.". */
export function formatEventTimeInLima(event: { startsAt: Date; endsAt?: Date | null }): string {
  const start = formatInLima(event.startsAt);
  return event.endsAt ? `${start} – ${formatTimeInLima(event.endsAt)}` : start;
}

const limaDayFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  dateStyle: "full",
});

/** The day in Lima, like "miércoles, 2 de diciembre de 2026". */
export function formatDayInLima(date: Date): string {
  return limaDayFormatter.format(date);
}

/** Start to end hour in Lima, like "7:00 p. m. – 9:00 p. m."; only the start when there's no end. */
export function formatTimeRangeInLima(event: { startsAt: Date; endsAt?: Date | null }): string {
  const start = formatTimeInLima(event.startsAt);
  return event.endsAt ? `${start} – ${formatTimeInLima(event.endsAt)}` : start;
}

const limaWeekdayDateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Weekday and date in Lima, like "Viernes 27 de noviembre de 2026" (for flyers). */
export function formatWeekdayDateInLima(date: Date): string {
  const text = limaWeekdayDateFormatter.format(date).replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const limaDatePartsFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
});

/** Pieces for a calendar tile in Lima: { weekday: "viernes", day: "27", month: "nov" }. */
export function limaDateParts(date: Date): { weekday: string; day: string; month: string } {
  const parts = Object.fromEntries(
    limaDatePartsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return { weekday: parts.weekday, day: parts.day, month: parts.month.replace(".", "") };
}
