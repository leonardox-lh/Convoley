import { clubLogoPath, getClubProfile } from "@/modules/clubs";
import { listEventTeams, MIN_TEAMS_TO_PLAY } from "@/modules/registrations";
import { EventHero } from "../../../event-hero";
import { EventSteps } from "../../../event-steps";
import { SpotsBadge } from "../../../spots-badge";
import { type loadEventPreview, seatsText } from "./event-preview";

type EventPreview = NonNullable<Awaited<ReturnType<typeof loadEventPreview>>>;

/** The event's colored header, the same on its three steps. */
export async function PublicEventHero(props: {
  club: string;
  event: EventPreview;
  action?: React.ReactNode;
}) {
  const { club, event } = props;
  const clubProfile = await getClubProfile(club);
  const seatsAreOpen = event.status === "published" || event.status === "full";
  return (
    <EventHero
      clubHref={`/${club}`}
      clubSuffix="Convocatoria"
      action={props.action}
      event={{
        ...event,
        logoSrc: clubProfile?.logoKey ? clubLogoPath(clubProfile.logoKey) : null,
        primaryColor: clubProfile?.primaryColor ?? null,
        secondaryColor: clubProfile?.secondaryColor ?? null,
        taken: event.capacity - event.freeSeats,
      }}
      showSeatsBar={seatsAreOpen}
      seats={
        seatsAreOpen ? (
          <SpotsBadge free={event.freeSeats} capacity={event.capacity} className="mt-1.5" />
        ) : (
          <span className="mt-1 text-sm font-medium">{seatsText(event)}</span>
        )
      }
    />
  );
}

/** Convocatoria · Equipos · Partidos for players: the organizer's same steps, only to look. */
export async function PublicEventSteps({ club, eventId }: { club: string; eventId: string }) {
  const { teams } = await listEventTeams(eventId);
  return (
    <EventSteps
      basePath={`/c/${club}/${eventId}`}
      teamsReady={teams.length >= MIN_TEAMS_TO_PLAY}
      lockedHint="El organizador aún no arma los equipos."
      className="px-0 pt-0"
    />
  );
}
