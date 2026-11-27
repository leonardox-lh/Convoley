import { cn } from "@/lib/utils";
import { VolleyballIcon } from "./volleyball";

/**
 * Convoley wordmark: both "o" are volleyballs.
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
          ley
        </span>
      </span>
    </span>
  );
}

function Ball() {
  return <VolleyballIcon className="mx-[0.015em] size-[0.56em] shrink-0 translate-y-[0.02em]" />;
}
