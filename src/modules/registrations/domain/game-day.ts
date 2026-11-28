import { InvalidMatchScoreError, InvalidPairingError, InvalidTeamNameError } from "./errors";

export const TEAM_NAME_MAX_LENGTH = 30;
export const MAX_MATCH_SCORE = 99;
export const MIN_TEAMS_TO_PLAY = 2;
/** Up to this many teams every pair plays twice; with more, once (keeps the day short). */
const DOUBLE_ROUND_MAX_TEAMS = 3;

export const defaultTeamName = (teamNumber: number) => `Equipo ${teamNumber}`;

/** Trimmed name; empty means "back to the default". */
export function normalizeTeamName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length > TEAM_NAME_MAX_LENGTH) throw new InvalidTeamNameError(name);
  return trimmed === "" ? null : trimmed;
}

export interface Pairing {
  homeTeam: number;
  awayTeam: number;
}

export interface Match extends Pairing {
  position: number;
  isFinal: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export const isPlayed = (match: Match) => match.homeScore !== null && match.awayScore !== null;

/**
 * Round robin by the circle method, so no team plays many matches in a row. With 3 teams or
 * fewer each pair plays twice (3 teams → 6 matches), home and away swapped in the second leg.
 */
export function buildFixture(teamNumbers: number[]): Pairing[] {
  const teams = [...teamNumbers].sort((a, b) => a - b);
  // A bye slot (null) makes the count even.
  const slots: (number | null)[] = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const firstLeg: Pairing[] = [];
  for (let round = 0; round < slots.length - 1; round++) {
    for (let index = 0; index < slots.length / 2; index++) {
      const home = slots[index];
      const away = slots[slots.length - 1 - index];
      if (home !== null && away !== null) firstLeg.push({ homeTeam: home, awayTeam: away });
    }
    // Keep the first slot fixed and rotate the rest.
    slots.splice(1, 0, slots.pop() as number | null);
  }
  if (teams.length > DOUBLE_ROUND_MAX_TEAMS) return firstLeg;
  return [
    ...firstLeg,
    ...firstLeg.map(({ homeTeam, awayTeam }) => ({ homeTeam: awayTeam, awayTeam: homeTeam })),
  ];
}

export function validateScore(homeScore: number, awayScore: number): void {
  const valid = (score: number) =>
    Number.isInteger(score) && score >= 0 && score <= MAX_MATCH_SCORE;
  // Volleyball has no draws.
  if (!valid(homeScore) || !valid(awayScore) || homeScore === awayScore) {
    throw new InvalidMatchScoreError(homeScore, awayScore);
  }
}

export interface Standing {
  teamNumber: number;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
}

export const pointDifference = (row: Standing) => row.pointsFor - row.pointsAgainst;

/**
 * Table: most wins, then point difference, then points scored. The final counts like any match,
 * and once it's played its winner ranks first and its loser second.
 */
export function standings(teamNumbers: number[], matches: Match[]): Standing[] {
  const table = tally(teamNumbers, matches);
  const winner = champion(matches);
  const final = matches.find((match) => match.isFinal);
  if (winner === null || !final) return table;
  const runnerUp = winner === final.homeTeam ? final.awayTeam : final.homeTeam;
  const rank = (teamNumber: number) =>
    teamNumber === winner ? 0 : teamNumber === runnerUp ? 1 : 2;
  // Array sort is stable: the rest keep their group order.
  return table.sort((a, b) => rank(a.teamNumber) - rank(b.teamNumber));
}

function tally(teamNumbers: number[], matches: Match[]): Standing[] {
  const rows = new Map<number, Standing>(
    teamNumbers.map((teamNumber) => [
      teamNumber,
      { teamNumber, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 },
    ]),
  );
  for (const match of matches) {
    if (!isPlayed(match)) continue;
    const home = rows.get(match.homeTeam);
    const away = rows.get(match.awayTeam);
    if (!home || !away) continue;
    const homeScore = match.homeScore as number;
    const awayScore = match.awayScore as number;
    for (const [row, own, other] of [
      [home, homeScore, awayScore],
      [away, awayScore, homeScore],
    ] as const) {
      row.played += 1;
      row.pointsFor += own;
      row.pointsAgainst += other;
      if (own > other) row.won += 1;
      else row.lost += 1;
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.won - a.won ||
      pointDifference(b) - pointDifference(a) ||
      b.pointsFor - a.pointsFor ||
      a.teamNumber - b.teamNumber,
  );
}

/** What the organizer is offered for the final: first against second of the table so far. */
export function suggestedFinal(teamNumbers: number[], matches: Match[]): Pairing | null {
  const [first, second] = tally(
    teamNumbers,
    matches.filter((match) => !match.isFinal),
  );
  if (!first || !second) return null;
  return { homeTeam: first.teamNumber, awayTeam: second.teamNumber };
}

/** Two different teams, both of this event. */
export function validatePairing(pairing: Pairing, teamNumbers: number[]): void {
  const { homeTeam, awayTeam } = pairing;
  if (homeTeam === awayTeam || !teamNumbers.includes(homeTeam) || !teamNumbers.includes(awayTeam)) {
    throw new InvalidPairingError(homeTeam, awayTeam);
  }
}

/**
 * The group match to swap places with when moving one up or down; null at either end. The final
 * isn't part of the group: it always closes the day.
 */
export function neighborToSwap<T extends Match>(
  matches: T[],
  moving: T,
  direction: "up" | "down",
): T | null {
  const group = matches.filter((match) => !match.isFinal).sort((a, b) => a.position - b.position);
  const index = group.indexOf(moving);
  if (index === -1) return null;
  return group[direction === "up" ? index - 1 : index + 1] ?? null;
}

export function champion(matches: Match[]): number | null {
  const final = matches.find((match) => match.isFinal);
  if (!final || !isPlayed(final)) return null;
  return (final.homeScore as number) > (final.awayScore as number)
    ? final.homeTeam
    : final.awayTeam;
}
