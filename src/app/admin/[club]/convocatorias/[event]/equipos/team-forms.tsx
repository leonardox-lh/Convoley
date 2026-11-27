"use client";

import { SelectPicker } from "@/components/date-time-pickers";
import { useActionState, useRef } from "react";
import { Field, floatingFieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { buildTeamsAction, moveToTeamAction, renameTeamAction, type TeamsState } from "./actions";

const DEFAULT_TEAM_COUNT = 3;

export function BuildTeamsForm(props: {
  clubSlug: string;
  eventId: string;
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
      <div className="flex items-end gap-3">
        <Field label="Equipos" className="w-28 shrink-0">
          <input
            placeholder=" "
            type="number"
            name="teamCount"
            min={2}
            max={props.maxTeams}
            defaultValue={DEFAULT_TEAM_COUNT}
            inputMode="numeric"
            className={floatingFieldClass}
          />
        </Field>
        <Button type="submit" size="lg" className="h-11 flex-1" disabled={pending}>
          {props.hasTeams ? "Volver a armar" : "Armar automáticamente"}
        </Button>
      </div>
      {props.hasTeams && (
        <p className="text-xs text-muted-foreground">Se borran los cambios que hiciste a mano.</p>
      )}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
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
  teams: { number: number; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={moveToTeamAction}>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="registrationId" value={props.registrationId} />
      <SelectPicker
        label={`Mover a ${props.playerName}`}
        name="teamNumber"
        defaultValue={props.teamNumber?.toString() ?? ""}
        required={false}
        className="w-40"
        // Send once React has put the chosen team in the hidden field.
        onChange={() => requestAnimationFrame(() => formRef.current?.requestSubmit())}
        options={[
          { value: "", label: "Sin equipo" },
          ...props.teams.map((team) => ({ value: String(team.number), label: team.name })),
        ]}
      />
    </form>
  );
}

/** Game day: the team's name, saved with its button; empty goes back to "Equipo N". */
export function RenameTeamForm(props: {
  clubSlug: string;
  eventId: string;
  teamNumber: number;
  name: string;
  maxLength: number;
}) {
  const [state, action, pending] = useActionState<TeamsState, FormData>(renameTeamAction, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="teamNumber" value={props.teamNumber} />
      <div className="flex gap-2">
        <input
          name="name"
          defaultValue={props.name}
          maxLength={props.maxLength}
          aria-label={`Nombre del equipo ${props.teamNumber}`}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-base font-semibold dark:border-zinc-700 dark:bg-zinc-900"
        />
        <Button type="submit" variant="outline" className="h-9" disabled={pending}>
          Guardar
        </Button>
      </div>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
