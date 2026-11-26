import { InvalidTeamCountError } from "../domain/errors";
import { holdsSeat } from "../domain/registration";
import { buildTeams, levelScore, MAX_TEAMS } from "../domain/teams";
import { teamNameMap } from "./game-day";
import type {
  RegistrationListItem,
  RegistrationListReader,
  TeamAssignments,
  TeamMatches,
  TeamNames,
} from "./ports";

type Deps = {
  registrations: RegistrationListReader;
  teams: TeamAssignments;
  names: TeamNames;
  matches: TeamMatches;
};

/** Only players holding a seat play: the waitlist and cancelled ones stay out. */
async function seatedPlayers(deps: Pick<Deps, "registrations">, eventId: string) {
  const rows = await deps.registrations.listByEvent(eventId);
  return rows
    .filter((row) => holdsSeat(row.status))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

const teamNumbersOf = (players: RegistrationListItem[]) =>
  [...new Set(players.flatMap((p) => (p.teamNumber ? [p.teamNumber] : [])))].sort((a, b) => a - b);

/** Game day: the numbers of the event's current teams. */
export function makeListTeamNumbers(deps: Pick<Deps, "registrations">) {
  return async (eventId: string) => teamNumbersOf(await seatedPlayers(deps, eventId));
}

/** HU-31: builds balanced teams; building again replaces manual moves and game-day matches. */
export function makeBuildEventTeams(deps: Deps) {
  return async function buildEventTeams(input: {
    eventId: string;
    teamCount: number;
    minWomenPerTeam: number;
  }) {
    const players = await seatedPlayers(deps, input.eventId);
    const teams = buildTeams({ ...input, players });
    await deps.teams.replaceAll(input.eventId, teams);
    // The fixture was for the old teams.
    await deps.matches.replaceAll(input.eventId, []);
  };
}

/** HU-31: the organizer moves a player by hand; null takes them out of every team. */
export function makeMoveToTeam(deps: Deps) {
  return async function moveToTeam(input: {
    eventId: string;
    registrationId: string;
    teamNumber: number | null;
  }): Promise<boolean> {
    const { teamNumber } = input;
    if (
      teamNumber !== null &&
      (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > MAX_TEAMS)
    ) {
      throw new InvalidTeamCountError(teamNumber);
    }
    return deps.teams.setTeam(input.eventId, input.registrationId, teamNumber);
  };
}

export interface EventTeam {
  number: number;
  /** Custom name, or "Equipo N". */
  name: string;
  players: RegistrationListItem[];
  /** Sum of level scores, so the organizer sees how even the teams are. */
  score: number;
}

/** HU-31/32: the event's teams in order, plus seated players without a team (late sign-ups). */
export function makeListEventTeams(deps: Deps) {
  return async function listEventTeams(eventId: string) {
    const players = await seatedPlayers(deps, eventId);
    const numbers = teamNumbersOf(players);
    const names = await teamNameMap(deps.names, eventId, numbers);
    const teams: EventTeam[] = numbers.map((number) => {
      const members = players.filter((player) => player.teamNumber === number);
      return {
        number,
        name: names.get(number) as string,
        players: members,
        score: members.reduce((sum, player) => sum + levelScore(player.level), 0),
      };
    });
    return { teams, unassigned: players.filter((player) => player.teamNumber === null) };
  };
}
