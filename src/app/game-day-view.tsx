import { Trophy } from "lucide-react";
import { VolleyballIcon } from "@/components/volleyball";
import { cn } from "@/lib/utils";
import { clubLogoPath } from "@/modules/clubs";
import { pointDifference, type GameDay } from "@/modules/registrations";
import {
  type TeamPlayer,
  TeamPlayersButton,
} from "./admin/[club]/convocatorias/[event]/partidos/team-players-button";

/** Game day pieces shown the same to organizers and players: the standings and the champion. */

const STAT_COLUMNS = [
  ["PJ", "Partidos jugados"],
  ["PG", "Partidos ganados"],
  ["PP", "Partidos perdidos"],
  ["Dif", "Diferencia de puntos"],
] as const;

/** Cards instead of a dense table: the leader stands out, the top two head for the final. */
export function StandingsTable({
  gameDay,
  hasFinal,
  playersOf,
}: {
  gameDay: GameDay;
  hasFinal: boolean;
  /** Who plays in each team, or null to show just the names (the list isn't public). */
  playersOf: Map<number, TeamPlayer[]> | null;
}) {
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
                {playersOf ? (
                  <TeamPlayersButton
                    name={nameOf.get(row.teamNumber) ?? `Equipo ${row.teamNumber}`}
                    players={playersOf.get(row.teamNumber) ?? []}
                  />
                ) : (
                  <span className="truncate font-semibold">
                    {nameOf.get(row.teamNumber) ?? `Equipo ${row.teamNumber}`}
                  </span>
                )}
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
export function ChampionBanner({ gameDay }: { gameDay: GameDay }) {
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
