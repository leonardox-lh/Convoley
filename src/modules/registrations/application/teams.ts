import { InvalidTeamCountError } from "../domain/errors";
import { holdsSeat } from "../domain/registration";
import { buildTeams, levelScore, MAX_TEAMS } from "../domain/teams";
import type { RegistrationListItem, RegistrationListReader, TeamAssignments } from "./ports";

type Deps = { registrations: RegistrationListReader; teams: TeamAssignments };

/** Only players holding a seat play: the waitlist and cancelled ones stay out. */
async function seatedPlayers(deps: Deps, eventId: string) {
  const rows = await deps.registrations.listByEvent(eventId);
  return rows
    .filter((row) => holdsSeat(row.status))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** HU-31: builds balanced teams; building again replaces any manual moves. */
export function makeBuildEventTeams(deps: Deps) {
  return async function buildEventTeams(input: {
    eventId: string;
    teamCount: number;
    minWomenPerTeam: number;
  }) {
    const players = await seatedPlayers(deps, input.eventId);
    const teams = buildTeams({ ...input, players });
    await deps.teams.replaceAll(input.eventId, teams);
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
  players: RegistrationListItem[];
  /** Sum of level scores, so the organizer sees how even the teams are. */
  score: number;
}

/** HU-31/32: the event's teams in order, plus seated players without a team (late sign-ups). */
export function makeListEventTeams(deps: Deps) {
  return async function listEventTeams(eventId: string) {
    const players = await seatedPlayers(deps, eventId);
    const numbers = [...new Set(players.flatMap((p) => (p.teamNumber ? [p.teamNumber] : [])))];
    const teams: EventTeam[] = numbers
      .sort((a, b) => a - b)
      .map((number) => {
        const members = players.filter((player) => player.teamNumber === number);
        return {
          number,
          players: members,
          score: members.reduce((sum, player) => sum + levelScore(player.level), 0),
        };
      });
    return { teams, unassigned: players.filter((player) => player.teamNumber === null) };
  };
}
