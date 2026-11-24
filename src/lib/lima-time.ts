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

const limaFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA_TIME_ZONE,
  dateStyle: "full",
  timeStyle: "short",
});

export function formatInLima(date: Date): string {
  return limaFormatter.format(date);
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
