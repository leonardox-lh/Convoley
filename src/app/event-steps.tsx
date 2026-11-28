"use client";

import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Convocatoria", path: "" },
  { label: "Equipos", path: "/equipos" },
  { label: "Partidos", path: "/partidos" },
] as const;
const MATCHES_STEP = 2;

/**
 * The event day in order: the event and its list, then the teams, then the matches. It lives in
 * the event's layout, so it stays put while the page below loads, and its bar slides to the step
 * tapped right away. Any step opens at any time, except the matches, which need the teams first.
 */
export function EventSteps(props: {
  basePath: string;
  /** Enough teams to play: until then "Partidos" is locked. */
  teamsReady: boolean;
  /** Why "Partidos" is locked; players read that the organizer hasn't built the teams yet. */
  lockedHint?: string;
  className?: string;
}) {
  const lockedHint = props.lockedHint ?? "Arma los equipos primero";
  const pathname = usePathname();
  const pathIndex = STEPS.findIndex(({ path }) => pathname === `${props.basePath}${path}`);
  // The step just tapped, so the bar moves before the next page arrives.
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null);
  const active = tapped && tapped.from === pathname ? tapped.index : pathIndex;
  // Other pages of the event (edit, attendance) don't show the steps.
  if (pathIndex === -1) return null;

  return (
    <nav
      aria-label="Pasos de la convocatoria"
      className={cn("mx-auto w-full max-w-md px-4 pt-4", props.className)}
    >
      <ol className="relative grid grid-cols-3">
        {/* One track from the first circle to the last; its fill slides to the active step. */}
        <span
          aria-hidden
          className="absolute top-4 right-[16.667%] left-[16.667%] h-1 -translate-y-1/2 overflow-hidden rounded-full bg-border"
        >
          <span
            className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${(active / (STEPS.length - 1)) * 100}%` }}
          />
        </span>
        {STEPS.map(({ label, path }, index) => {
          const isActive = index === active;
          const isDone = index < active;
          const locked = index === MATCHES_STEP && !props.teamsReady;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold ring-4 ring-background transition-all duration-300",
                  isActive
                    ? "scale-110 border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30 delay-200"
                    : isDone
                      ? "border-primary bg-background text-primary delay-200"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                {locked ? (
                  <Lock className="size-3.5" aria-hidden />
                ) : isDone ? (
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </>
          );
          const itemClass = "relative z-10 flex flex-col items-center gap-1";
          return (
            <li key={label} className="flex justify-center">
              {locked ? (
                <span
                  aria-disabled
                  title={lockedHint}
                  className={cn(itemClass, "cursor-not-allowed opacity-60")}
                >
                  {content}
                  <span className="sr-only">({lockedHint})</span>
                </span>
              ) : (
                <Link
                  href={`${props.basePath}${path}`}
                  aria-current={index === pathIndex ? "step" : undefined}
                  onClick={() => index !== pathIndex && setTapped({ index, from: pathname })}
                  className={itemClass}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {/* Players already read it on the empty teams page below. */}
      {!props.teamsReady && pathIndex === 1 && !props.lockedHint && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Arma los equipos para pasar a los partidos.
        </p>
      )}
    </nav>
  );
}
