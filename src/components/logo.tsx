import { cn } from "@/lib/utils";
import { VolleyballIcon } from "./volleyball";

/** Convoley mark: a volleyball with the wordmark. Decorative icon, the text carries the name. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <VolleyballIcon className={cn("shrink-0", size === "lg" ? "size-12" : "size-8")} />
      <span className={size === "lg" ? "text-4xl" : "text-xl"}>
        Con<span data-logo-accent className="text-primary">voley</span>
      </span>
    </span>
  );
}
