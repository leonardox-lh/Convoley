"use client";

import { useActionState } from "react";
import { fieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { buildTeamsAction, moveToTeamAction, type TeamsState } from "./actions";

const labelClass = "flex flex-col gap-1.5 text-sm font-medium";
const DEFAULT_TEAM_COUNT = 2;
const DEFAULT_MIN_WOMEN = 2;

export function BuildTeamsForm(props: {
  clubSlug: string;
  eventId: string;
  isMixed: boolean;
  maxTeams: number;
  hasTeams: boolean;
}) {
  const [state, action, pending] = useActionState<TeamsState, FormData>(buildTeamsAction, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Equipos
          <input
            type="number"
            name="teamCount"
            min={2}
            max={props.maxTeams}
            defaultValue={DEFAULT_TEAM_COUNT}
            inputMode="numeric"
            className={fieldClass}
          />
        </label>
        {props.isMixed && (
          <label className={labelClass}>
            Mínimo de chicas
            <input
              type="number"
              name="minWomenPerTeam"
              min={0}
              max={6}
              defaultValue={DEFAULT_MIN_WOMEN}
              inputMode="numeric"
              className={fieldClass}
            />
          </label>
        )}
      </div>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {props.hasTeams ? "Volver a armar (borra los cambios a mano)" : "Armar equipos"}
      </Button>
    </form>
  );
}

/** HU-31: moving a player by hand submits as soon as a team is picked. */
export function MoveToTeamSelect(props: {
  clubSlug: string;
  eventId: string;
  registrationId: string;
  playerName: string;
  teamNumber: number | null;
  teamNumbers: number[];
}) {
  return (
    <form action={moveToTeamAction}>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="registrationId" value={props.registrationId} />
      <select
        name="teamNumber"
        defaultValue={props.teamNumber ?? ""}
        aria-label={`Mover a ${props.playerName}`}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">Sin equipo</option>
        {props.teamNumbers.map((number) => (
          <option key={number} value={number}>
            Equipo {number}
          </option>
        ))}
      </select>
    </form>
  );
}
