import { describe, expect, it } from "vitest";
import { InvalidMatchScoreError, InvalidTeamNameError } from "./errors";
import {
  buildFixture,
  champion,
  finalPairing,
  normalizeTeamName,
  standings,
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
  it("ranks by wins, then point difference, and ignores the final", () => {
    const fixture = buildFixture([1, 2, 3]);
    const matches = played(fixture, [
      [15, 10],
      [12, 15],
      [15, 13],
      [15, 9],
      [10, 15],
      [15, 11],
    ]);
    const table = standings(
      [1, 2, 3],
      [
        ...matches,
        { position: 7, isFinal: true, homeTeam: 1, awayTeam: 2, homeScore: 15, awayScore: 0 },
      ],
    );
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

  it("no final until every group match has a score", () => {
    expect(finalPairing([1, 2, 3], played(fixture, [[15, 10]]))).toBeNull();
  });

  it("the final is first against second; its winner is the champion", () => {
    // Team 3 loses everything, so the final is between 1 and 2.
    const scores = fixture.map<[number, number]>(({ homeTeam, awayTeam }) =>
      homeTeam === 3 ? [5, 15] : awayTeam === 3 ? [15, 5] : homeTeam === 1 ? [15, 13] : [15, 12],
    );
    const matches = played(fixture, scores);
    const pairing = finalPairing([1, 2, 3], matches);
    expect(pairing && [pairing.homeTeam, pairing.awayTeam].sort()).toEqual([1, 2]);
    expect(champion(matches)).toBeNull();
    const final: Match = { ...pairing!, position: 7, isFinal: true, homeScore: 12, awayScore: 15 };
    expect(champion([...matches, final])).toBe(pairing!.awayTeam);
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
