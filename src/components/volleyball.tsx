import { cn } from "@/lib/utils";

/** A volleyball: three curved panels meeting near the center, each with its two seams. */
export function VolleyballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="2.25 2.25 19.5 19.5" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" className="fill-brand-ball" />
      {/* Seams: the app blue on light backgrounds, white on dark ones (--ball-seam, globals.css). */}
      <g fill="none" strokeWidth="1.5" strokeLinecap="round" style={{ stroke: "var(--ball-seam)" }}>
        <path d="M12 12a8 8 0 0 0 8 4" />
        <path d="M7.5 13.5a12 12 0 0 0 8.5 6.5" />
        <path d="M12 12a8 8 0 0 0-7.464 4.928" />
        <path d="M12.951 7.353a12 12 0 0 0-9.88 4.111" />
        <path d="M12 12a8 8 0 0 0-.536-8.928" />
        <path d="M15.549 15.147a12 12 0 0 0 1.38-10.611" />
        <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

/** Loading state: a volleyball spinning with a little bounce. */
export function VolleyballLoader({
  label = "Cargando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}
    >
      <span className="animate-bounce [animation-duration:900ms]">
        <VolleyballIcon className="size-12 animate-spin [animation-duration:1.2s] motion-reduce:animate-none" />
      </span>
      <span aria-hidden className="h-1.5 w-8 animate-pulse rounded-full bg-foreground/10" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
