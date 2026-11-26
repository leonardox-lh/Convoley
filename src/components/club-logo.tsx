import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_PX = 96;

/** The club's logo, or its initial on a soft badge when it has none: club screens always show one. */
export function ClubLogo({
  name,
  src,
  className,
}: {
  name: string;
  /** Public logo URL; null when the club never uploaded one. */
  src: string | null;
  className?: string;
}) {
  const shape = cn("size-16 shrink-0 rounded-2xl", className);
  if (src) {
    return (
      <Image
        src={src}
        alt={`Logo de ${name}`}
        width={LOGO_PX}
        height={LOGO_PX}
        unoptimized
        className={cn(shape, "bg-white object-cover shadow-md ring-2 ring-white/40")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        shape,
        "flex items-center justify-center bg-white/20 text-2xl font-semibold text-white ring-2 ring-white/30",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
