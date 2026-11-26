"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { recordScoreAction, startGameDayAction, type GameDayState } from "./actions";

const IDLE: GameDayState = { status: "idle" };

type Target = { clubSlug: string; eventId: string };

function TargetFields(props: Target) {
  return (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
    </>
  );
}

/** Builds the fixture; starting again asks first because it wipes every score. */
export function StartGameDayForm(props: Target & { hasMatches: boolean }) {
  const [state, action, pending] = useActionState(startGameDayAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (props.hasMatches && !confirm("Se borran todos los resultados. ¿Empezar de nuevo?")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-2"
    >
      <TargetFields {...props} />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button
        type="submit"
        size="lg"
        variant={props.hasMatches ? "outline" : "default"}
        className="h-11"
        disabled={pending}
      >
        {props.hasMatches ? "Reiniciar partidos" : "Empezar partidos"}
      </Button>
    </form>
  );
}

const scoreClass =
  "w-14 rounded-md border border-zinc-300 bg-white px-1 py-1.5 text-center text-lg font-semibold tabular-nums dark:border-zinc-700 dark:bg-zinc-900";

/** One match: both scores and a save button. */
export function MatchScoreForm(
  props: Target & {
    matchId: string;
    label: string;
    homeName: string;
    awayName: string;
    homeScore: number | null;
    awayScore: number | null;
    maxScore: number;
  },
) {
  const [state, action, pending] = useActionState(recordScoreAction, IDLE);
  const played = props.homeScore !== null && props.awayScore !== null;
  const scoreInput = (name: string, value: number | null, team: string) => (
    <input
      type="number"
      name={name}
      min={0}
      max={props.maxScore}
      inputMode="numeric"
      defaultValue={value ?? ""}
      required
      aria-label={`Puntos de ${team} · ${props.label}`}
      className={scoreClass}
    />
  );
  return (
    <form action={action} className="flex flex-col gap-2 py-3">
      <TargetFields {...props} />
      <input type="hidden" name="matchId" value={props.matchId} />
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="font-medium uppercase">{props.label}</span>
        {played && <span>Jugado</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
        <span className="truncate text-right text-sm font-medium">{props.homeName}</span>
        {scoreInput("homeScore", props.homeScore, props.homeName)}
        <span className="text-zinc-400">–</span>
        {scoreInput("awayScore", props.awayScore, props.awayName)}
        <span className="truncate text-sm font-medium">{props.awayName}</span>
      </div>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" variant={played ? "outline" : "default"} disabled={pending}>
        {played ? "Corregir resultado" : "Guardar resultado"}
      </Button>
    </form>
  );
}
