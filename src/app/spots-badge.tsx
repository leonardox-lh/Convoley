import { cn } from "@/lib/utils";
import { spotsLevel, type SpotsLevel } from "@/modules/events";

const LEVEL_CLASSES: Record<SpotsLevel, string> = {
  plenty: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  filling: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  almost: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

/** "17 cupos libres de 18", green while there's room, yellow filling up, red almost full. */
export function SpotsBadge({
  free,
  capacity,
  className,
}: {
  free: number;
  capacity: number;
  className?: string;
}) {
  const text =
    free === 0
      ? `Llena · ${capacity} de ${capacity}`
      : `${free} ${free === 1 ? "cupo libre" : "cupos libres"} de ${capacity}`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        LEVEL_CLASSES[spotsLevel(free, capacity)],
        className,
      )}
    >
      {text}
    </span>
  );
}
