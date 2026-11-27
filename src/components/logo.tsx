import { cn } from "@/lib/utils";
import { VolleyballIcon } from "./volleyball";

/**
 * Convoley wordmark: both "o" are volleyballs and the "l" is the red-and-white net antenna.
 * Letters and drawings are decorative; screen readers get the plain name.
 */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-bold tracking-[-0.045em] leading-none whitespace-nowrap",
        size === "lg" ? "text-4xl" : "text-[1.4rem]",
        className,
      )}
    >
      <span className="sr-only">Convoley</span>
      <span aria-hidden className="inline-flex items-baseline">
        C<Ball />n
        <span data-logo-accent className="inline-flex items-baseline text-primary">
          v<Ball />
          <Antenna />
          ey
        </span>
      </span>
    </span>
  );
}

function Ball() {
  return <VolleyballIcon className="mx-[0.015em] size-[0.56em] shrink-0 translate-y-[0.02em]" />;
}

/** The net antenna as the letter "l": a rounded rod in red and white bands. */
function Antenna() {
  return (
    <svg viewBox="0 0 14 74" className="mx-[0.025em] h-[0.74em] w-[0.17em] shrink-0">
      <rect width="14" height="74" rx="7" fill="#e11d48" />
      <g fill="white">
        <rect y="10" width="14" height="10" />
        <rect y="30" width="14" height="10" />
        <rect y="50" width="14" height="10" />
      </g>
      <rect
        x="0.9"
        y="0.9"
        width="12.2"
        height="72.2"
        rx="6.1"
        fill="none"
        stroke="#be123c"
        strokeWidth="1.8"
      />
    </svg>
  );
}
