import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Convoley wordmark: both "o" are the glossy volleyball of the event flyers.
 * Letters and drawings are decorative; screen readers get the plain name.
 */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-bold tracking-[-0.045em] leading-none whitespace-nowrap",
        size === "lg" ? "text-4xl" : "text-[1.85rem]",
        className,
      )}
    >
      <span className="sr-only">Convoley</span>
      <span aria-hidden className="inline-flex items-baseline">
        C<Ball />n
        <span data-logo-accent className="inline-flex items-baseline text-primary">
          v<Ball />
          ley
        </span>
      </span>
    </span>
  );
}

/**
 * White shine with a blue and a gold panel. On white pages a thin dark outline keeps it visible;
 * on dark backgrounds the outline goes away (--logo-ball-outline, globals.css).
 */
function Ball() {
  const shineId = useId();
  return (
    <svg
      viewBox="2.25 2.25 19.5 19.5"
      aria-hidden
      className="mx-[0.015em] size-[0.56em] shrink-0 translate-y-[0.02em]"
    >
      <defs>
        <radialGradient id={shineId} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e6ecff" />
          <stop offset="1" stopColor="#8ea6e8" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="9.75" fill={`url(#${shineId})`} />
      <path
        d="M12 12a8 8 0 0 0 8 4 9.75 9.75 0 0 1-4 4 12 12 0 0 1-8.5-6.5z"
        className="fill-brand-ball"
        opacity="0.9"
      />
      <path
        d="M12 12a8 8 0 0 0-.536-8.928 9.75 9.75 0 0 1 5.465 1.464 12 12 0 0 1-1.38 10.611z"
        fill="#1d4ed8"
        opacity="0.85"
      />
      <g fill="none" stroke="#0a1a4a" strokeWidth="0.9" strokeLinecap="round" opacity="0.8">
        <path d="M12 12a8 8 0 0 0 8 4" />
        <path d="M7.5 13.5a12 12 0 0 0 8.5 6.5" />
        <path d="M12 12a8 8 0 0 0-7.464 4.928" />
        <path d="M12.951 7.353a12 12 0 0 0-9.88 4.111" />
        <path d="M12 12a8 8 0 0 0-.536-8.928" />
        <path d="M15.549 15.147a12 12 0 0 0 1.38-10.611" />
      </g>
      <circle
        cx="12"
        cy="12"
        r="9.2"
        fill="none"
        strokeWidth="1.1"
        style={{ stroke: "var(--logo-ball-outline)" }}
      />
    </svg>
  );
}
