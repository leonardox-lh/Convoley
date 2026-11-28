import { Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { VolleyballLoader } from "@/components/volleyball";
import { cn } from "@/lib/utils";
import { getGameDay, listEventTeams, MIN_TEAMS_TO_PLAY } from "@/modules/registrations";
import { EmptyTab } from "../../../../[club]/empty-tab";
import { ChampionBanner, StandingsTable } from "../../../../game-day-view";
import { POSITION_LABELS } from "../../../../player-labels";
import { loadEventPreview } from "../event-preview";

type Props = PageProps<"/c/[club]/[event]/partidos">;

/** Scores, standings and the champion as the organizer records them, only to look. */
export default function PublicGameDayPage({ params }: Props) {
  return (
    <main className="flex flex-col gap-5">
      <Suspense fallback={<VolleyballLoader />}>
        <PublicGameDay params={params} />
      </Suspense>
    </main>
  );
}

async function PublicGameDay({ params }: Pick<Props, "params">) {
  const { club, event: eventId } = await params;
  const event = await loadEventPreview(club, eventId);
  if (!event) notFound();
  const [gameDay, { teams }] = await Promise.all([getGameDay(event.id), listEventTeams(event.id)]);
  if (teams.length < MIN_TEAMS_TO_PLAY) redirect(`/c/${club}/${event.id}/equipos`);
  // Who plays in each team only when the organizer made the list public.
  const playersOf = event.showRoster
    ? new Map(
        teams.map((team) => [
          team.number,
          team.players.map((player) => ({
            id: player.id,
            name: `${player.firstName} ${player.lastName}`,
            gender: player.gender,
            position: player.position && POSITION_LABELS[player.position],
          })),
        ]),
      )
    : null;
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const groupMatches = gameDay.matches.filter((match) => !match.isFinal);
  const hasFinal = groupMatches.length < gameDay.matches.length;

  return (
    <>
      {gameDay.matches.length === 0 ? (
        <EmptyTab icon={Trophy}>Los partidos todavía no empiezan.</EmptyTab>
      ) : (
        <>
          {gameDay.champion && <ChampionBanner gameDay={gameDay} />}
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Tabla de posiciones</h2>
            <StandingsTable gameDay={gameDay} hasFinal={hasFinal} playersOf={playersOf} />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Partidos</h2>
            <ol className="flex flex-col gap-2">
              {gameDay.matches.map((match) => {
                const played = match.homeScore !== null && match.awayScore !== null;
                const label = match.isFinal
                  ? "Final"
                  : `Partido ${groupMatches.indexOf(match) + 1} de ${groupMatches.length}`;
                return (
                  <li
                    key={match.id}
                    className={cn(
                      "rounded-2xl border bg-card px-4 py-3",
                      match.isFinal && "border-amber-300 bg-amber-50/60 dark:bg-amber-950/30",
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                      <span className="truncate font-semibold">
                        {nameOf.get(match.homeTeam) ?? `Equipo ${match.homeTeam}`}
                      </span>
                      <span className="rounded-lg bg-secondary px-2.5 py-1 font-bold tabular-nums">
                        {played ? `${match.homeScore} – ${match.awayScore}` : "vs"}
                      </span>
                      <span className="truncate text-right font-semibold">
                        {nameOf.get(match.awayTeam) ?? `Equipo ${match.awayTeam}`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
