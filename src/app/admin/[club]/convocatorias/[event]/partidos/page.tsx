import { VolleyballLoader } from "@/components/volleyball";
import { PanelIntro } from "../../../panel-hero";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getOrganizerEvent } from "@/modules/events";
import {
  getGameDay,
  listEventTeams,
  MIN_TEAMS_TO_PLAY,
  MAX_MATCH_SCORE,
} from "@/modules/registrations";
import { requireOrganizer } from "../../../require-organizer";
import { ShareImageSection } from "../share-image-section";
import { ChampionPhotoForm, MatchScoreForm, StartGameDayForm } from "./game-day-forms";
import { POSITION_LABELS } from "../../../../../player-labels";
import { AddMatchButtons, MatchActions } from "./match-editing";
import { ChampionBanner, StandingsTable } from "../../../../../game-day-view";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/partidos">;

/** Game day: round robin with scores, live table, final and champion; admin and helper. */
export default function GameDayPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<VolleyballLoader />}>
        <GameDayContent params={params} />
      </Suspense>
    </main>
  );
}

async function GameDayContent({ params }: Pick<Props, "params">) {
  const { club: clubSlug, event: eventId } = await params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) notFound();
  const event = await getOrganizerEvent({ clubSlug, eventId });
  if (!event) notFound();
  const [gameDay, { teams }] = await Promise.all([getGameDay(event.id), listEventTeams(event.id)]);
  const basePath = `/admin/${clubSlug}/convocatorias/${event.id}`;
  // The matches come after the teams: without them there is nothing to play yet.
  if (teams.length < MIN_TEAMS_TO_PLAY) redirect(`${basePath}/equipos`);
  const playersOf = new Map(
    teams.map((team) => [
      team.number,
      team.players.map((player) => ({
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        gender: player.gender,
        position: player.position && POSITION_LABELS[player.position],
      })),
    ]),
  );
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const target = { clubSlug, eventId: event.id };
  const hasMatches = gameDay.matches.length > 0;
  const groupMatches = gameDay.matches.filter((match) => !match.isFinal);
  const hasFinal = groupMatches.length < gameDay.matches.length;

  return (
    <div className="flex flex-col gap-6">
      <PanelIntro>
        Te armamos todos contra todos. Agrega, cambia u ordena los partidos, y arma la final cuando
        quieras.
      </PanelIntro>

      {gameDay.champion && (
        <section className="flex flex-col gap-3">
          <ChampionBanner gameDay={gameDay} />
          <ChampionPhotoForm {...target} hasPhoto={gameDay.championPhotoKey !== null} />
        </section>
      )}

      {!hasMatches && <StartGameDayForm {...target} hasMatches={false} />}

      {hasMatches && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Tabla de posiciones</h2>
            <StandingsTable gameDay={gameDay} hasFinal={hasFinal} playersOf={playersOf} />
          </section>

          <ShareImageSection
            id="schedule-banner"
            title="Programación"
            imagePath={`${basePath}/partidos/imagen?tipo=programacion&formato=historia`}
            fileName={`programacion-${event.id}.png`}
          />
          {gameDay.champion && (
            <ShareImageSection
              id="champion-banner"
              title="Equipo campeón"
              imagePath={`${basePath}/partidos/imagen?tipo=campeon&formato=historia`}
              fileName={`campeon-${event.id}.png`}
            />
          )}

          <section className="flex flex-col">
            <h2 className="font-semibold">Partidos</h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {gameDay.matches.map((match) => {
                const groupIndex = groupMatches.indexOf(match);
                const label = match.isFinal
                  ? "Final"
                  : `Partido ${groupIndex + 1} de ${groupMatches.length}`;
                return (
                  <MatchScoreForm
                    key={`${match.id}-${match.homeTeam}-${match.awayTeam}`}
                    {...target}
                    matchId={match.id}
                    label={label}
                    homeName={nameOf.get(match.homeTeam) ?? `Equipo ${match.homeTeam}`}
                    awayName={nameOf.get(match.awayTeam) ?? `Equipo ${match.awayTeam}`}
                    homeScore={match.homeScore}
                    awayScore={match.awayScore}
                    maxScore={MAX_MATCH_SCORE}
                    actions={
                      <MatchActions
                        key={match.id}
                        {...target}
                        matchId={match.id}
                        label={label}
                        teams={gameDay.teams}
                        pairing={{ homeTeam: match.homeTeam, awayTeam: match.awayTeam }}
                        played={match.homeScore !== null && match.awayScore !== null}
                        canMoveUp={groupIndex > 0}
                        canMoveDown={groupIndex !== -1 && groupIndex < groupMatches.length - 1}
                      />
                    }
                  />
                );
              })}
            </div>
            <AddMatchButtons
              {...target}
              teams={gameDay.teams}
              hasFinal={hasFinal}
              suggestedFinal={gameDay.suggestedFinal}
            />
          </section>

          <StartGameDayForm {...target} hasMatches />
        </>
      )}
    </div>
  );
}
