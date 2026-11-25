import { InvalidTeamCountError, NotEnoughWomenError } from "./errors";
import type { PlayerGender, PlayerLevel, PlayerPosition } from "./registration";

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 8;

const LEVEL_SCORE: Record<PlayerLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 };
/** Players who didn't say their level count as intermediate. */
const UNKNOWN_LEVEL_SCORE = LEVEL_SCORE.intermediate;
// Scarce positions first, so each team gets its setter and libero before the rest fill in.
const POSITION_ORDER: (PlayerPosition | null)[] = [
  "setter",
  "libero",
  "middle_blocker",
  "opposite",
  "outside_hitter",
  "any",
  null,
];

export interface TeamPlayer {
  id: string;
  position: PlayerPosition | null;
  level: PlayerLevel | null;
  gender: PlayerGender | null;
  createdAt: Date;
}

export const levelScore = (level: PlayerLevel | null) =>
  level ? LEVEL_SCORE[level] : UNKNOWN_LEVEL_SCORE;

interface Team {
  number: number;
  playerIds: string[];
  score: number;
  positions: Map<PlayerPosition | null, number>;
}

/** Strongest first; ties by arrival so the same list always gives the same teams. */
const byLevelThenArrival = (a: TeamPlayer, b: TeamPlayer) =>
  levelScore(b.level) - levelScore(a.level) || a.createdAt.getTime() - b.createdAt.getTime();

/** The team with fewest players, then fewest in this position, then the weakest. */
function pickTeam(teams: Team[], position: PlayerPosition | null): Team {
  return [...teams].sort(
    (a, b) =>
      a.playerIds.length - b.playerIds.length ||
      (a.positions.get(position) ?? 0) - (b.positions.get(position) ?? 0) ||
      a.score - b.score ||
      a.number - b.number,
  )[0];
}

function add(team: Team, player: TeamPlayer): void {
  team.playerIds.push(player.id);
  team.score += levelScore(player.level);
  team.positions.set(player.position, (team.positions.get(player.position) ?? 0) + 1);
}

/**
 * HU-31: balanced teams by level and position. In mixed events each team first gets
 * `minWomenPerTeam` women; then everyone else is dealt by position and level, always to the
 * smallest team, so sizes differ by at most one. Returns registration id → team number (1-based).
 */
export function buildTeams(input: {
  players: TeamPlayer[];
  teamCount: number;
  minWomenPerTeam: number;
}): Map<string, number> {
  const { players, teamCount, minWomenPerTeam } = input;
  if (!Number.isInteger(teamCount) || teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
    throw new InvalidTeamCountError(teamCount);
  }
  if (teamCount > players.length) throw new InvalidTeamCountError(teamCount);
  const teams: Team[] = Array.from({ length: teamCount }, (_, index) => ({
    number: index + 1,
    playerIds: [],
    score: 0,
    positions: new Map(),
  }));

  const women = players.filter((player) => player.gender === "female").sort(byLevelThenArrival);
  const womenNeeded = minWomenPerTeam * teamCount;
  if (women.length < womenNeeded) throw new NotEnoughWomenError(womenNeeded, women.length);
  // Snake order (1..n, n..1) evens out the level of the women each team gets.
  const reserved = women.slice(0, womenNeeded);
  reserved.forEach((woman, index) => {
    const round = Math.floor(index / teamCount);
    const slot = index % teamCount;
    add(teams[round % 2 === 0 ? slot : teamCount - 1 - slot], woman);
  });

  const reservedIds = new Set(reserved.map((woman) => woman.id));
  const rest = players
    .filter((player) => !reservedIds.has(player.id))
    .sort(
      (a, b) =>
        POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
        byLevelThenArrival(a, b),
    );
  for (const player of rest) add(pickTeam(teams, player.position), player);

  return new Map(teams.flatMap((team) => team.playerIds.map((id) => [id, team.number])));
}
