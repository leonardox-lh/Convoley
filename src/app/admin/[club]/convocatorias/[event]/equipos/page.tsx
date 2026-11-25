import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrganizerEvent } from "@/modules/events";
import { listEventTeams, MAX_TEAMS, type EventTeam } from "@/modules/registrations";
import { GENDER_LABELS, LEVEL_LABELS, POSITION_LABELS } from "../../../../../player-labels";
import { requireOrganizer } from "../../../require-organizer";
import { BuildTeamsForm, MoveToTeamSelect } from "./team-forms";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/equipos">;

/** HU-31: balanced teams for game day; admin and helper. */
export default function TeamsPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <TeamsContent params={params} />
      </Suspense>
    </main>
  );
}

type Player = EventTeam["players"][number];

function playerDetails(player: Player): string {
  return [
    player.position && POSITION_LABELS[player.position],
    player.level && LEVEL_LABELS[player.level],
    player.gender && GENDER_LABELS[player.gender],
  ]
    .filter(Boolean)
    .join(" · ");
}

async function TeamsContent({ params }: Pick<Props, "params">) {
  const { club: clubSlug, event: eventId } = await params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) notFound();
  const event = await getOrganizerEvent({ clubSlug, eventId });
  if (!event) notFound();
  const { teams, unassigned } = await listEventTeams(event.id);
  const teamNumbers = teams.map((team) => team.number);
  const basePath = `/admin/${clubSlug}/convocatorias/${event.id}`;

  const playerRow = (player: Player) => (
    <li key={player.id} className="flex items-center justify-between gap-2 py-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {player.firstName} {player.lastName}
        </span>
        <span className="text-xs text-zinc-500">{playerDetails(player)}</span>
      </div>
      <MoveToTeamSelect
        clubSlug={clubSlug}
        eventId={event.id}
        registrationId={player.id}
        playerName={`${player.firstName} ${player.lastName}`}
        teamNumber={player.teamNumber}
        teamNumbers={teamNumbers}
      />
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={basePath} className="text-sm text-zinc-500 underline">
          Volver a la lista
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Equipos · {event.title}</h1>
        <p className="text-sm text-zinc-500">
          Se arman con los inscritos que tienen cupo, parejos por nivel y posición.
        </p>
      </div>
      <BuildTeamsForm
        clubSlug={clubSlug}
        eventId={event.id}
        isMixed={event.isMixed}
        maxTeams={MAX_TEAMS}
        hasTeams={teams.length > 0}
      />
      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {[
            ["cuadrado", "Imagen cuadrada"],
            ["historia", "Imagen para historia"],
          ].map(([format, label]) => (
            <a
              key={format}
              href={`${basePath}/equipos/imagen?formato=${format}`}
              download={`equipos-${event.id}-${format}.png`}
              className="rounded-lg border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium dark:border-zinc-700"
            >
              {label}
            </a>
          ))}
        </div>
      )}
      {teams.map((team) => (
        <section key={team.number} className="flex flex-col gap-1">
          <h2 className="font-semibold">
            Equipo {team.number}{" "}
            <span className="text-sm font-normal text-zinc-500">
              · {team.players.length} jugadores · nivel {team.score}
            </span>
          </h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {team.players.map(playerRow)}
          </ul>
        </section>
      ))}
      {unassigned.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="font-semibold">Sin equipo</h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {unassigned.map(playerRow)}
          </ul>
        </section>
      )}
    </div>
  );
}
