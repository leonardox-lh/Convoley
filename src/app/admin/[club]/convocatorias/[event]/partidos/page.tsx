import { PageHeadingLoading } from "@/components/page-heading";
import { PanelHeading } from "../../../panel-hero";
import { Trophy, Swords } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { clubLogoPath } from "@/modules/clubs";
import { getOrganizerEvent } from "@/modules/events";
import {
  getGameDay,
  MAX_MATCH_SCORE,
  pointDifference,
  type GameDay,
} from "@/modules/registrations";
import { cn } from "@/lib/utils";
import { VolleyballIcon } from "@/components/volleyball";
import { requireOrganizer } from "../../../require-organizer";
import { ShareImageSection } from "../share-image-section";
import { ChampionPhotoForm, MatchScoreForm, StartGameDayForm } from "./game-day-forms";
import { AddMatchButtons, MatchActions } from "./match-editing";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/partidos">;

/** Game day: round robin with scores, live table, final and champion; admin and helper. */
export default function GameDayPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<PageHeadingLoading />}>
        <GameDayContent params={params} />
      </Suspense>
    </main>
  );
}

const STAT_COLUMNS = [
  ["PJ", "Partidos jugados"],
  ["PG", "Partidos ganados"],
  ["PP", "Partidos perdidos"],
  ["Dif", "Diferencia de puntos"],
] as const;

/** Cards instead of a dense table: the leader stands out, the top two head for the final. */
function StandingsTable({ gameDay, hasFinal }: { gameDay: GameDay; hasFinal: boolean }) {
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 px-3 text-[11px] font-medium text-muted-foreground uppercase">
        <span className="flex-1">Equipo</span>
        <span className="grid w-40 grid-cols-4 text-center">
          {STAT_COLUMNS.map(([short, long]) => (
            <abbr key={short} title={long} className="no-underline">
              {short}
            </abbr>
          ))}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {gameDay.standings.map((row, index) => {
          const leader = index === 0 && row.played > 0;
          const isChampion = row.teamNumber === gameDay.champion?.number;
          const headsToFinal = index < 2 && row.played > 0 && !hasFinal;
          const difference = pointDifference(row);
          return (
            <li
              key={row.teamNumber}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5",
                leader && "border-primary/40 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  isChampion
                    ? "bg-linear-to-b from-amber-200 via-amber-400 to-amber-600 text-amber-950"
                    : leader
                      ? "bg-primary text-primary-foreground"
                      : index === 1 && row.played > 0
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {isChampion ? (
                  <Trophy role="img" aria-label="Campeón" className="size-4" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 truncate font-semibold">
                  <span className="truncate">{nameOf.get(row.teamNumber)}</span>
                </span>
                {headsToFinal && <span className="text-xs text-primary">Va a la final</span>}
              </span>
              <span className="grid w-40 shrink-0 grid-cols-4 text-center text-sm tabular-nums">
                <span>{row.played}</span>
                <span className="font-bold">{row.won}</span>
                <span className="text-muted-foreground">{row.lost}</span>
                <span
                  className={cn(
                    "font-medium",
                    difference > 0 && "text-green-600",
                    difference < 0 && "text-destructive",
                  )}
                >
                  {difference > 0 ? "+" : ""}
                  {difference}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The day's closing moment: gold medal, the champion's name, its photo and the final's score. */
function ChampionBanner({ gameDay }: { gameDay: GameDay }) {
  const champion = gameDay.champion;
  const final = gameDay.matches.find((match) => match.isFinal);
  if (!champion || !final) return null;
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const championIsHome = final.homeTeam === champion.number;
  const [won, lost] = championIsHome
    ? [final.homeScore, final.awayScore]
    : [final.awayScore, final.homeScore];
  const runnerUp = nameOf.get(championIsHome ? final.awayTeam : final.homeTeam);
  const photoUrl = gameDay.championPhotoKey && clubLogoPath(gameDay.championPhotoKey);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0a1a4a] text-white shadow-xl ring-1 ring-amber-300/30 animate-in fade-in zoom-in-95 duration-500">
      {/* Soft gold light behind the medal. */}
      <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-amber-400/25 blur-3xl" />
      <VolleyballIcon className="pointer-events-none absolute -right-10 -bottom-10 size-40 opacity-10" />
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- stored club image, already sized
        <img
          src={photoUrl}
          alt={`Foto de ${champion.name}`}
          className="relative aspect-4/3 w-full object-cover [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
        />
      )}
      <div
        className={cn(
          "relative flex flex-col items-center gap-2 px-5 pb-6 text-center",
          photoUrl ? "-mt-10" : "pt-7",
        )}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-linear-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_32px_rgba(251,191,36,0.55)] ring-4 ring-amber-300/30">
          <Trophy aria-hidden className="size-8 text-amber-950" strokeWidth={2.25} />
        </span>
        <p className="mt-1 text-xs font-bold tracking-[0.3em] text-amber-300 uppercase">Campeón</p>
        <p className="text-3xl leading-tight font-black tracking-tight text-balance">
          {champion.name}
        </p>
        <p className="mt-1 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 ring-1 ring-white/15">
          Final{" "}
          <span className="font-bold text-white tabular-nums">
            {won} – {lost}
          </span>{" "}
          vs {runnerUp}
        </p>
      </div>
    </div>
  );
}

async function GameDayContent({ params }: Pick<Props, "params">) {
  const { club: clubSlug, event: eventId } = await params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) notFound();
  const event = await getOrganizerEvent({ clubSlug, eventId });
  if (!event) notFound();
  const gameDay = await getGameDay(event.id);
  const basePath = `/admin/${clubSlug}/convocatorias/${event.id}`;
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  const target = { clubSlug, eventId: event.id };
  const hasMatches = gameDay.matches.length > 0;
  const groupMatches = gameDay.matches.filter((match) => !match.isFinal);
  const hasFinal = groupMatches.length < gameDay.matches.length;

  return (
    <div className="flex flex-col gap-6">
      <PanelHeading
        clubSlug={clubSlug}
        icon={Swords}
        eyebrow={event.title}
        eyebrowHref={`${basePath}/equipos`}
        title="Partidos"
      >
        Te armamos todos contra todos. Agrega, cambia u ordena los partidos, y arma la final cuando
        quieras.
      </PanelHeading>

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
            <StandingsTable gameDay={gameDay} hasFinal={hasFinal} />
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
