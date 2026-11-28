import type { EventCategory } from "@/modules/events";
import { cn } from "@/lib/utils";

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  mixed: "Mixto",
  men: "Solo hombres",
  women: "Solo mujeres",
};

// Avatar busts drawn here: lucide has no woman figure, so both share one style.
const MAN_HAIR =
  "M7.4 9.6C7.1 6 9.2 4 12 4s4.9 2 4.6 5.6C15.8 8.2 14.2 7.4 12 7.4S8.2 8.2 7.4 9.6Z";
const WOMAN_HAIR =
  "M6.6 15V9.8C6.6 6.2 9 4 12 4s5.4 2.2 5.4 5.8V15h-1.9c.8-1.2 1.1-2.7.9-4.2-.8-1.6-2.6-2.7-4.4-3.2-1.8.5-3.6 1.6-4.4 3.2-.2 1.5.1 3 .9 4.2Z";

function Person({ hair, className }: { hair: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0 fill-current", className)}>
      <circle cx="12" cy="9.8" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 22c.4-3.9 4-6 8.5-6s8.1 2.1 8.5 6Z" />
      <path d={hair} />
    </svg>
  );
}

/** A man for men only, a woman for women only, both side by side for mixed. */
export function EventCategoryIcon({
  category,
  className = "size-4",
}: {
  category: EventCategory;
  className?: string;
}) {
  return (
    <span aria-hidden className="inline-flex items-center">
      {category !== "women" && <Person hair={MAN_HAIR} className={className} />}
      {category !== "men" && <Person hair={WOMAN_HAIR} className={className} />}
    </span>
  );
}
