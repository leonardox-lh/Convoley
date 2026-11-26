import { InvalidTeamCountError, MatchNotFoundError } from "../domain/errors";
import {
  buildFixture,
  champion,
  defaultTeamName,
  finalPairing,
  isPlayed,
  MIN_TEAMS_TO_PLAY,
  normalizeTeamName,
  standings,
  validateScore,
  type Standing,
} from "../domain/game-day";
import { MAX_TEAMS } from "../domain/teams";
import type { StoredMatch, TeamMatches, TeamNames } from "./ports";

type Deps = {
  names: TeamNames;
  matches: TeamMatches;
  /** The event's current team numbers, from the team assignments. */
  teamNumbers: (eventId: string) => Promise<number[]>;
};

export function makeRenameTeam(deps: Pick<Deps, "names">) {
  return async function renameTeam(input: { eventId: string; teamNumber: number; name: string }) {
    const { teamNumber } = input;
    if (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > MAX_TEAMS) {
      throw new InvalidTeamCountError(teamNumber);
    }
    await deps.names.set(input.eventId, teamNumber, normalizeTeamName(input.name));
  };
}

/** Builds the round robin from the current teams; starting again wipes every score. */
export function makeStartGameDay(deps: Deps) {
  return async function startGameDay(eventId: string) {
    const teamNumbers = await deps.teamNumbers(eventId);
    if (teamNumbers.length < MIN_TEAMS_TO_PLAY) {
      throw new InvalidTeamCountError(teamNumbers.length);
    }
    await deps.matches.replaceAll(eventId, buildFixture(teamNumbers));
  };
}

/** Saves a score; once the group is complete the final (1st vs 2nd) appears or follows the table. */
export function makeRecordMatchScore(deps: Deps) {
  return async function recordMatchScore(input: {
    eventId: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
  }) {
    validateScore(input.homeScore, input.awayScore);
    if (!(await deps.matches.setScore(input))) throw new MatchNotFoundError(input.eventId);
    const [teamNumbers, matches] = await Promise.all([
      deps.teamNumbers(input.eventId),
      deps.matches.list(input.eventId),
    ]);
    const final = matches.find((match) => match.isFinal);
    const pairing = finalPairing(teamNumbers, matches);
    if (!pairing || (final && isPlayed(final))) return;
    if (final?.homeTeam === pairing.homeTeam && final.awayTeam === pairing.awayTeam) return;
    await deps.matches.setFinal(input.eventId, pairing);
  };
}

export interface GameDayTeam {
  number: number;
  name: string;
}

export interface GameDay {
  teams: GameDayTeam[];
  matches: StoredMatch[];
  standings: Standing[];
  champion: GameDayTeam | null;
}

/** Team names by number, defaults included. */
export async function teamNameMap(names: TeamNames, eventId: string, teamNumbers: number[]) {
  const custom = await names.list(eventId);
  return new Map(
    teamNumbers.map((number) => [number, custom.get(number) ?? defaultTeamName(number)]),
  );
}

export function makeGetGameDay(deps: Deps) {
  return async function getGameDay(eventId: string): Promise<GameDay> {
    const [teamNumbers, matches] = await Promise.all([
      deps.teamNumbers(eventId),
      deps.matches.list(eventId),
    ]);
    const names = await teamNameMap(deps.names, eventId, teamNumbers);
    const teams = teamNumbers.map((number) => ({ number, name: names.get(number) as string }));
    const winner = champion(matches);
    return {
      teams,
      matches,
      standings: standings(teamNumbers, matches),
      champion: teams.find((team) => team.number === winner) ?? null,
    };
  };
}
