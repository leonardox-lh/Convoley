/** Index = weekday as stored (0 = domingo), like Date.getDay(). */
export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const MINUTES_PER_HOUR = 60;

/** "20:00" from minutes after midnight. */
export function startMinuteToTime(startMinute: number): string {
  const hours = Math.floor(startMinute / MINUTES_PER_HOUR);
  const minutes = startMinute % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
