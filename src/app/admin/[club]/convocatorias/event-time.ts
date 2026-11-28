const DEFAULT_DURATION_HOURS = 2;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/**
 * End time to prefill once the start is chosen: two hours after the start rounded to the
 * nearest hour. Organizers often post 6:50 so players arrive early, but the game runs 7 to 9.
 * Null when that would pass midnight: the form keeps start and end on the same day.
 */
export function suggestedEndTime(start: string): string | null {
  const [hour, minute] = start.split(":").map(Number);
  const roundedHour = hour + (minute >= MINUTES_PER_HOUR / 2 ? 1 : 0);
  const endHour = roundedHour + DEFAULT_DURATION_HOURS;
  if (endHour >= HOURS_PER_DAY) return null;
  return `${String(endHour).padStart(2, "0")}:00`;
}
