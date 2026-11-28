import { describe, expect, it } from "vitest";
import { InvalidMatchScoreError, InvalidPairingError, InvalidTeamNameError } from "./errors";
import {
  buildFixture,
  champion,
  neighborToSwap,
  normalizeTeamName,
  standings,
  suggestedFinal,
  validatePairing,
  validateScore,
  type Match,
} from "./game-day";

const pairKey = (a: number, b: number) => [a, b].sort().join("-");

function played(fixture: { homeTeam: number; awayTeam: number }[], scores: [number, number][]) {
  return fixture.map<Match>((pairing, index) => ({
    ...pairing,
    position: index + 1,
    isFinal: false,
    homeScore: scores[index]?.[0] ?? null,
    awayScore: scores[index]?.[1] ?? null,
  }));
}

describe("buildFixture", () => {
  it("3 teams: every pair plays twice, 6 matches, home and away swapped", () => {
    const fixture = buildFixture([1, 2, 3]);
    expect(fixture).toHaveLength(6);
    const counts = new Map<string, number>();
    for (const { homeTeam, awayTeam } of fixture) {
      expect(homeTeam).not.toBe(awayTeam);
      const key = pairKey(homeTeam, awayTeam);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({ "1-2": 2, "1-3": 2, "2-3": 2 });
    expect(fixture.slice(3)).toEqual(
      fixture.slice(0, 3).map((m) => ({ homeTeam: m.awayTeam, awayTeam: m.homeTeam })),
    );
  });

  it("4 teams: single round robin, 6 matches", () => {
    const fixture = buildFixture([1, 2, 3, 4]);
    expect(fixture).toHaveLength(6);
    expect(new Set(fixture.map((m) => pairKey(m.homeTeam, m.awayTeam))).size).toBe(6);
  });
});

describe("standings", () => {
  it("ranks by wins, then point difference", () => {
    const fixture = buildFixture([1, 2, 3]);
    const matches = played(fixture, [
      [15, 10],
      [12, 15],
      [15, 13],
      [15, 9],
      [10, 15],
      [15, 11],
    ]);
    const table = standings([1, 2, 3], matches);
    expect(table.map((row) => row.played)).toEqual([4, 4, 4]);
    expect(table.reduce((sum, row) => sum + row.won, 0)).toBe(6);
    for (let index = 1; index < table.length; index++) {
      expect(table[index - 1].won).toBeGreaterThanOrEqual(table[index].won);
    }
  });

  it("breaks a tie on wins with point difference", () => {
    const matches: Match[] = [
      { position: 1, isFinal: false, homeTeam: 1, awayTeam: 2, homeScore: 15, awayScore: 14 },
      { position: 2, isFinal: false, homeTeam: 2, awayTeam: 1, homeScore: 15, awayScore: 5 },
    ];
    expect(standings([1, 2], matches).map((row) => row.teamNumber)).toEqual([2, 1]);
  });
});

describe("final and champion", () => {
  const fixture = buildFixture([1, 2, 3]);

  it("suggests the final from the table so far, even mid-way", () => {
    // Only the first match is played: its winner leads the table.
    const pairing = suggestedFinal([1, 2, 3], played(fixture, [[15, 10]]));
    expect(pairing?.homeTeam).toBe(fixture[0].homeTeam);
  });

  it("the suggested final is first against second; its winner is the champion", () => {
    // Team 3 loses everything, so the final is between 1 and 2.
    const scores = fixture.map<[number, number]>(({ homeTeam, awayTeam }) =>
      homeTeam === 3 ? [5, 15] : awayTeam === 3 ? [15, 5] : homeTeam === 1 ? [15, 13] : [15, 12],
    );
    const matches = played(fixture, scores);
    const pairing = suggestedFinal([1, 2, 3], matches);
    expect(pairing && [pairing.homeTeam, pairing.awayTeam].sort()).toEqual([1, 2]);
    expect(champion(matches)).toBeNull();
    const final: Match = { ...pairing!, position: 7, isFinal: true, homeScore: 12, awayScore: 15 };
    expect(champion([...matches, final])).toBe(pairing!.awayTeam);
  });

  it("the final counts as a match, and its winner tops the table and its loser is second", () => {
    // Team 1 wins the group, team 3 is last, but team 3 beats team 1 in the final.
    const scores = fixture.map<[number, number]>(({ homeTeam }) =>
      homeTeam === 1 ? [15, 5] : [5, 15],
    );
    const matches = played(fixture, scores);
    const final: Match = {
      position: 7,
      isFinal: true,
      homeTeam: 1,
      awayTeam: 3,
      homeScore: 10,
      awayScore: 15,
    };
    const before = standings([1, 2, 3], matches);
    const after = standings([1, 2, 3], [...matches, final]);
    expect(after.map((row) => row.teamNumber)).toEqual([3, 1, 2]);
    const row = (table: typeof after, team: number) => table.find((it) => it.teamNumber === team)!;
    expect(row(after, 3).won).toBe(row(before, 3).won + 1);
    expect(row(after, 1).lost).toBe(row(before, 1).lost + 1);
    expect(row(after, 3).played).toBe(row(before, 3).played + 1);
    const pending: Match = { ...final, homeScore: null, awayScore: null };
    expect(standings([1, 2, 3], [...matches, pending])[0].teamNumber).not.toBe(3);
  });
});

describe("scores and names", () => {
  it("rejects draws, negatives and decimals", () => {
    expect(() => validateScore(15, 15)).toThrow(InvalidMatchScoreError);
    expect(() => validateScore(-1, 15)).toThrow(InvalidMatchScoreError);
    expect(() => validateScore(15.5, 10)).toThrow(InvalidMatchScoreError);
    expect(() => validateScore(15, 12)).not.toThrow();
  });

  it("trims names, empty goes back to the default, too long is rejected", () => {
    expect(normalizeTeamName("  Los   Tigres ")).toBe("Los Tigres");
    expect(normalizeTeamName("   ")).toBeNull();
    expect(() => normalizeTeamName("x".repeat(31))).toThrow(InvalidTeamNameError);
  });
});

describe("organizer's own matches", () => {
  it("a match needs two different teams of the event", () => {
    expect(() => validatePairing({ homeTeam: 1, awayTeam: 2 }, [1, 2, 3])).not.toThrow();
    expect(() => validatePairing({ homeTeam: 2, awayTeam: 2 }, [1, 2, 3])).toThrow(
      InvalidPairingError,
    );
    expect(() => validatePairing({ homeTeam: 1, awayTeam: 4 }, [1, 2, 3])).toThrow(
      InvalidPairingError,
    );
  });

  it("moving swaps with the next group match; the final stays last", () => {
    const [first, second, third] = played(buildFixture([1, 2, 3]), []);
    const final: Match = { ...first, position: 9, isFinal: true };
    const matches = [first, second, third, final];
    expect(neighborToSwap(matches, second, "up")).toBe(first);
    expect(neighborToSwap(matches, second, "down")).toBe(third);
    expect(neighborToSwap(matches, first, "up")).toBeNull();
    expect(neighborToSwap(matches.slice(0, 3).concat(final), third, "down")).toBeNull();
    expect(neighborToSwap(matches, final, "up")).toBeNull();
  });
});
