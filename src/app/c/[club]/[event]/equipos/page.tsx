import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GenderIcon } from "@/components/gender-icon";
import { VolleyballLoader } from "@/components/volleyball";
import { listEventTeams } from "@/modules/registrations";
import { EmptyTab } from "../../../../[club]/empty-tab";
import { POSITION_LABELS } from "../../../../player-labels";
import { loadEventPreview } from "../event-preview";

type Props = PageProps<"/c/[club]/[event]/equipos">;

/** The teams as the organizer built them, only to look. */
export default function PublicTeamsPage({ params }: Props) {
  return (
    <main className="flex flex-col gap-5">
      <Suspense fallback={<VolleyballLoader />}>
        <PublicTeams params={params} />
      </Suspense>
    </main>
  );
}

async function PublicTeams({ params }: Pick<Props, "params">) {
  const { club, event: eventId } = await params;
  const event = await loadEventPreview(club, eventId);
  if (!event) notFound();
  const { teams } = await listEventTeams(event.id);

  return (
    <>
      {teams.length === 0 ? (
        <EmptyTab icon={Users}>El organizador todavía no arma los equipos.</EmptyTab>
      ) : (
        <ul className="flex flex-col gap-3">
          {teams.map((team) => (
            <li key={team.number} className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="flex items-center justify-between gap-3 font-semibold">
                <span className="truncate">{team.name}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {team.players.length} {team.players.length === 1 ? "jugador" : "jugadores"}
                </span>
              </h2>
              {/* Names only when the organizer made the list public. */}
              {event.showRoster && (
                <ul className="mt-2 divide-y">
                  {team.players.map((player) => (
                    <li key={player.id} className="flex items-center gap-1.5 py-2 text-sm">
                      <span className="truncate">
                        {player.firstName} {player.lastName}
                      </span>
                      <GenderIcon gender={player.gender} />
                      {player.position && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {POSITION_LABELS[player.position]}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
