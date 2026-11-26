import { Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getOrganizerEvent } from "@/modules/events";
import {
  getGameDay,
  MAX_MATCH_SCORE,
  pointDifference,
  type GameDay,
} from "@/modules/registrations";
import { requireOrganizer } from "../../../require-organizer";
import { MatchScoreForm, StartGameDayForm } from "./game-day-forms";

type Props = PageProps<"/admin/[club]/convocatorias/[event]/partidos">;

/** Game day: round robin with scores, live table, final and champion; admin and helper. */
export default function GameDayPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <GameDayContent params={params} />
      </Suspense>
    </main>
  );
}

function BannerLinks(props: { basePath: string; kind: "tabla" | "campeon"; title: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{props.title}</span>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["cuadrado", "Cuadrada"],
          ["historia", "Para historia"],
        ].map(([format, label]) => (
          <a
            key={format}
            href={`${props.basePath}/partidos/imagen?tipo=${props.kind}&formato=${format}`}
            download={`${props.kind}-${format}.png`}
            className="rounded-lg border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium dark:border-zinc-700"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function StandingsTable({ gameDay }: { gameDay: GameDay }) {
  const nameOf = new Map(gameDay.teams.map((team) => [team.number, team.name]));
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-zinc-500">
        <tr>
          <th className="py-1 text-left font-medium">Equipo</th>
          <th className="w-9 font-medium" title="Partidos jugados">
            PJ
          </th>
          <th className="w-9 font-medium" title="Partidos ganados">
            PG
          </th>
          <th className="w-9 font-medium" title="Partidos perdidos">
            PP
          </th>
          <th className="w-11 font-medium" title="Diferencia de puntos">
            Dif
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {gameDay.standings.map((row, index) => (
          <tr key={row.teamNumber}>
            <td className="truncate py-2 font-medium">
              {index + 1}. {nameOf.get(row.teamNumber)}
            </td>
            <td className="text-center tabular-nums">{row.played}</td>
            <td className="text-center font-semibold tabular-nums">{row.won}</td>
            <td className="text-center tabular-nums">{row.lost}</td>
            <td className="text-center tabular-nums">
              {pointDifference(row) > 0 ? "+" : ""}
              {pointDifference(row)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
  const groupCount = gameDay.matches.filter((match) => !match.isFinal).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`${basePath}/equipos`} className="text-sm text-zinc-500 underline">
          Volver a los equipos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Partidos · {event.title}</h1>
        <p className="text-sm text-zinc-500">
          Todos contra todos y, al final, una final entre el 1.º y el 2.º de la tabla.
        </p>
      </div>

      {gameDay.champion && (
        <section className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <Trophy aria-hidden className="size-8 shrink-0" />
          <div>
            <p className="text-xs font-medium uppercase">Campeón</p>
            <p className="text-xl font-bold">{gameDay.champion.name}</p>
          </div>
        </section>
      )}

      {!hasMatches && <StartGameDayForm {...target} hasMatches={false} />}

      {hasMatches && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Tabla de posiciones</h2>
            <StandingsTable gameDay={gameDay} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Banners para el grupo</h2>
            <BannerLinks basePath={basePath} kind="tabla" title="Cómo va la tabla" />
            {gameDay.champion && (
              <BannerLinks basePath={basePath} kind="campeon" title="Equipo campeón" />
            )}
          </section>

          <section className="flex flex-col">
            <h2 className="font-semibold">Partidos</h2>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {gameDay.matches.map((match) => (
                <MatchScoreForm
                  key={`${match.id}-${match.homeTeam}-${match.awayTeam}`}
                  {...target}
                  matchId={match.id}
                  label={match.isFinal ? "Final" : `Partido ${match.position} de ${groupCount}`}
                  homeName={nameOf.get(match.homeTeam) ?? `Equipo ${match.homeTeam}`}
                  awayName={nameOf.get(match.awayTeam) ?? `Equipo ${match.awayTeam}`}
                  homeScore={match.homeScore}
                  awayScore={match.awayScore}
                  maxScore={MAX_MATCH_SCORE}
                />
              ))}
            </div>
            {!gameDay.matches.some((match) => match.isFinal) && (
              <p className="pt-2 text-sm text-zinc-500">
                La final aparece cuando estén todos los resultados.
              </p>
            )}
          </section>

          <StartGameDayForm {...target} hasMatches />
        </>
      )}
    </div>
  );
}
