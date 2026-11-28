import { Users } from "lucide-react";
import { PageHeading, PageHeadingLoading } from "@/components/page-heading";
import Link from "next/link";
import { GenderIcon } from "@/components/gender-icon";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrganizerEvent } from "@/modules/events";
import {
  listEventTeams,
  MAX_TEAMS,
  MIN_TEAMS_TO_PLAY,
  TEAM_NAME_MAX_LENGTH,
  type EventTeam,
} from "@/modules/registrations";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEVEL_LABELS, POSITION_LABELS } from "../../../../../player-labels";
import { requireOrganizer } from "../../../require-organizer";
import { ShareImageSection } from "../share-image-section";
import { BuildTeamsForm, MoveToTeamSelect, RenameTeamForm } from "./team-forms";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/equipos">;

/** HU-31: balanced teams for game day; admin and helper. */
export default function TeamsPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<PageHeadingLoading />}>
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
  const teamOptions = teams.map(({ number, name }) => ({ number, name }));
  const basePath = `/admin/${clubSlug}/convocatorias/${event.id}`;

  const playerRow = (player: Player) => (
    <li key={player.id} className="flex items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="truncate">
            {player.firstName} {player.lastName}
          </span>
          <GenderIcon gender={player.gender} />
        </span>
        <span className="text-xs text-zinc-500">{playerDetails(player)}</span>
      </div>
      <MoveToTeamSelect
        clubSlug={clubSlug}
        eventId={event.id}
        registrationId={player.id}
        playerName={`${player.firstName} ${player.lastName}`}
        teamNumber={player.teamNumber}
        teams={teamOptions}
      />
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={Users} eyebrow={event.title} eyebrowHref={basePath} title="Equipos">
        Se arman con los inscritos que tienen cupo, parejos por nivel y posición.
      </PageHeading>
      <BuildTeamsForm
        clubSlug={clubSlug}
        eventId={event.id}
        maxTeams={MAX_TEAMS}
        hasTeams={teams.length > 0}
      />
      {teams.length >= MIN_TEAMS_TO_PLAY && (
        <Link
          href={`${basePath}/partidos`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 border-primary text-primary hover:bg-primary/10 hover:text-primary",
          )}
        >
          Gestionar el partido
        </Link>
      )}
      {teams.length > 0 && (
        <ShareImageSection
          id="teams-image"
          title="Imagen de los equipos"
          imagePath={`${basePath}/equipos/imagen`}
          fileName={`equipos-${event.id}.png`}
        />
      )}
      {teams.map((team) => (
        <section key={team.number} className="flex flex-col gap-1">
          <RenameTeamForm
            clubSlug={clubSlug}
            eventId={event.id}
            teamNumber={team.number}
            name={team.name}
            maxLength={TEAM_NAME_MAX_LENGTH}
          />
          <p className="text-sm text-zinc-500">
            {team.players.length} {team.players.length === 1 ? "jugador" : "jugadores"} · nivel{" "}
            {team.score}
          </p>
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
