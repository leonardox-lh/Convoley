import { Mars, Venus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chico/chica mark next to a player's name; nothing when the event didn't ask (not mixed). */
export function GenderIcon({ gender, className }: { gender: string | null; className?: string }) {
  if (gender === "male")
    return <Mars aria-label="Chico" className={cn("size-4 shrink-0 text-sky-600", className)} />;
  if (gender === "female")
    return <Venus aria-label="Chica" className={cn("size-4 shrink-0 text-pink-600", className)} />;
  return null;
}
