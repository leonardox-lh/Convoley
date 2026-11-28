import { Suspense } from "react";
import { listEventTeams, MIN_TEAMS_TO_PLAY } from "@/modules/registrations";
import { requireOrganizer } from "../../require-organizer";
import { EventSteps } from "../../../../event-steps";

type Props = LayoutProps<"/admin/[club]/convocatorias/[event]">;

/** The steps sit above the event's pages and never reload: only the page under them does. */
export default function EventLayout({ children, params }: Props) {
  return (
    <>
      {/* Same height as the steps, so nothing jumps when they arrive. */}
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <StepsFor params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function StepsFor({ params }: Pick<Props, "params">) {
  const { club: clubSlug, event: eventId } = await params;
  // The pages answer "not found" themselves; the steps just stay out of the way.
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) return null;
  const { teams } = await listEventTeams(eventId);
  return (
    <EventSteps
      basePath={`/admin/${clubSlug}/convocatorias/${eventId}`}
      teamsReady={teams.length >= MIN_TEAMS_TO_PLAY}
    />
  );
}
