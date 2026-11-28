import {
  FinalAlreadyExistsError,
  InvalidTeamCountError,
  MatchAlreadyPlayedError,
  MatchNotFoundError,
  NoChampionYetError,
} from "../domain/errors";
import {
  buildFixture,
  champion,
  defaultTeamName,
  isPlayed,
  MIN_TEAMS_TO_PLAY,
  neighborToSwap,
  normalizeTeamName,
  standings,
  suggestedFinal,
  validatePairing,
  validateScore,
  type Pairing,
  type Standing,
} from "../domain/game-day";
import { MAX_TEAMS } from "../domain/teams";
import type { ChampionPhotos, StoredMatch, TeamMatches, TeamNames } from "./ports";

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

export function makeRecordMatchScore(deps: Pick<Deps, "matches">) {
  return async function recordMatchScore(input: {
    eventId: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
  }) {
    validateScore(input.homeScore, input.awayScore);
    if (!(await deps.matches.setScore(input))) throw new MatchNotFoundError(input.eventId);
  };
}

// Callers pass whole form inputs: only the two teams reach the repository.
const pairingOf = ({ homeTeam, awayTeam }: Pairing): Pairing => ({ homeTeam, awayTeam });

async function requireMatch(deps: Pick<Deps, "matches">, eventId: string, matchId: string) {
  const matches = await deps.matches.list(eventId);
  const match = matches.find((candidate) => candidate.id === matchId);
  if (!match) throw new MatchNotFoundError(eventId);
  return { match, matches };
}

/** Organizer's own match on top of the generated ones; it plays before the final. */
export function makeAddMatch(deps: Deps) {
  return async function addMatch(input: { eventId: string } & Pairing) {
    const pairing = pairingOf(input);
    validatePairing(pairing, await deps.teamNumbers(input.eventId));
    await deps.matches.add(input.eventId, pairing, false);
  };
}

/** The organizer decides when the final is played and by whom; 1st vs 2nd is only a suggestion. */
export function makeCreateFinal(deps: Deps) {
  return async function createFinal(input: { eventId: string } & Pairing) {
    const pairing = pairingOf(input);
    validatePairing(pairing, await deps.teamNumbers(input.eventId));
    const matches = await deps.matches.list(input.eventId);
    if (matches.some((match) => match.isFinal)) throw new FinalAlreadyExistsError(input.eventId);
    await deps.matches.add(input.eventId, pairing, true);
  };
}

/** Changes who plays; a match with a score keeps its teams so the table stays true. */
export function makeChangeMatchTeams(deps: Deps) {
  return async function changeMatchTeams(input: { eventId: string; matchId: string } & Pairing) {
    const pairing = pairingOf(input);
    validatePairing(pairing, await deps.teamNumbers(input.eventId));
    const { match } = await requireMatch(deps, input.eventId, input.matchId);
    if (isPlayed(match)) throw new MatchAlreadyPlayedError(match.id);
    await deps.matches.setTeams(match.id, pairing);
  };
}

export function makeDeleteMatch(deps: Pick<Deps, "matches">) {
  return async function deleteMatch(input: { eventId: string; matchId: string }) {
    const { match } = await requireMatch(deps, input.eventId, input.matchId);
    await deps.matches.remove(match.id);
  };
}

/** One place earlier or later in the play order; the final stays last. */
export function makeMoveMatch(deps: Pick<Deps, "matches">) {
  return async function moveMatch(input: {
    eventId: string;
    matchId: string;
    direction: "up" | "down";
  }) {
    const { match, matches } = await requireMatch(deps, input.eventId, input.matchId);
    const neighbor = neighborToSwap(matches, match, input.direction);
    if (neighbor) await deps.matches.swapPositions(match, neighbor);
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
  /** First against second of the table so far, offered when the organizer sets up the final. */
  suggestedFinal: Pairing | null;
  /** Stored image key of the champion team's photo, if the organizer added one. */
  championPhotoKey: string | null;
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
    const [teamNumbers, matches, championPhotoKey] = await Promise.all([
      deps.teamNumbers(eventId),
      deps.matches.list(eventId),
      deps.matches.championPhotoKey(eventId),
    ]);
    const names = await teamNameMap(deps.names, eventId, teamNumbers);
    const teams = teamNumbers.map((number) => ({ number, name: names.get(number) as string }));
    const winner = champion(matches);
    const championTeam = teams.find((team) => team.number === winner) ?? null;
    return {
      teams,
      matches,
      standings: standings(teamNumbers, matches),
      champion: championTeam,
      suggestedFinal: suggestedFinal(teamNumbers, matches),
      championPhotoKey: championTeam ? championPhotoKey : null,
    };
  };
}

/** The winning team's photo for the champion banner; only once the final has a winner. */
export function makeSetChampionPhoto(deps: Pick<Deps, "matches"> & { photos: ChampionPhotos }) {
  return async function setChampionPhoto(input: {
    clubSlug: string;
    eventId: string;
    image: { bytes: Uint8Array; contentType: string };
  }) {
    if (champion(await deps.matches.list(input.eventId)) === null) {
      throw new NoChampionYetError(input.eventId);
    }
    const key = await deps.photos.save(input.clubSlug, input.image);
    await deps.matches.setChampionPhotoKey(input.eventId, key);
  };
}
