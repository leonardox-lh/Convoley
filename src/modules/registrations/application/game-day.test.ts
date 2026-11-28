import { describe, expect, it } from "vitest";
import {
  FinalAlreadyExistsError,
  InvalidPairingError,
  MatchAlreadyPlayedError,
  NoChampionYetError,
} from "../domain/errors";
import {
  makeAddMatch,
  makeChangeMatchTeams,
  makeCreateFinal,
  makeMoveMatch,
  makeSetChampionPhoto,
} from "./game-day";
import type { StoredMatch, TeamMatches } from "./ports";

const final = (homeScore: number | null): StoredMatch => ({
  id: "final",
  position: 4,
  isFinal: true,
  homeTeam: 1,
  awayTeam: 2,
  homeScore,
  awayScore: homeScore === null ? null : 20,
});

function setup(matches: StoredMatch[]) {
  let photoKey: string | null = null;
  const saved: string[] = [];
  const store = {
    list: async () => matches,
    championPhotoKey: async () => photoKey,
    setChampionPhotoKey: async (_eventId: string, key: string) => {
      photoKey = key;
    },
  } as unknown as TeamMatches;
  const setChampionPhoto = makeSetChampionPhoto({
    matches: store,
    photos: {
      save: async (clubSlug) => {
        saved.push(clubSlug);
        return `${clubSlug}-photo.jpg`;
      },
    },
  });
  return { setChampionPhoto, saved, photoKey: () => photoKey };
}

const input = {
  clubSlug: "club-1",
  eventId: "event-1",
  image: { bytes: new Uint8Array([1]), contentType: "image/jpeg" },
};

describe("foto del equipo campeón", () => {
  it("se guarda cuando la final ya tiene ganador", async () => {
    const { setChampionPhoto, photoKey } = setup([final(25)]);
    await setChampionPhoto(input);
    expect(photoKey()).toBe("club-1-photo.jpg");
  });

  it("antes de jugar la final no se sube nada", async () => {
    const { setChampionPhoto, saved } = setup([final(null)]);
    await expect(setChampionPhoto(input)).rejects.toBeInstanceOf(NoChampionYetError);
    expect(saved).toEqual([]);
  });
});

/** In-memory matches of one event with teams 1, 2 and 3. */
function matchesOfEvent(initial: StoredMatch[]) {
  const rows = initial.map((match) => ({ ...match }));
  const store = {
    list: async () => rows,
    add: async (
      _eventId: string,
      pairing: { homeTeam: number; awayTeam: number },
      isFinal: boolean,
    ) => {
      rows.push({
        id: `m${rows.length + 1}`,
        position: rows.length + 1,
        isFinal,
        homeScore: null,
        awayScore: null,
        ...pairing,
      });
    },
    setTeams: async (matchId: string, pairing: { homeTeam: number; awayTeam: number }) => {
      Object.assign(
        rows.find((row) => row.id === matchId)!,
        pairing,
      );
    },
    swapPositions: async (first: StoredMatch, second: StoredMatch) => {
      [first.position, second.position] = [second.position, first.position];
    },
  } as unknown as TeamMatches;
  const deps = { matches: store, names: {} as never, teamNumbers: async () => [1, 2, 3] };
  return { rows, deps };
}

const groupMatch = (
  id: string,
  position: number,
  homeScore: number | null = null,
): StoredMatch => ({
  id,
  position,
  isFinal: false,
  homeTeam: 1,
  awayTeam: 2,
  homeScore,
  awayScore: homeScore === null ? null : 10,
});

describe("partidos editables por el organizador", () => {
  it("agrega un partido con dos equipos distintos del evento", async () => {
    const { rows, deps } = matchesOfEvent([]);
    // Form inputs carry more fields; only the two teams may reach the database.
    await makeAddMatch(deps)({ eventId: "e", homeTeam: 3, awayTeam: 1, clubSlug: "c" } as never);
    expect(rows).toEqual([expect.objectContaining({ homeTeam: 3, awayTeam: 1, isFinal: false })]);
    expect(rows[0]).not.toHaveProperty("clubSlug");
    await expect(
      makeAddMatch(deps)({ eventId: "e", homeTeam: 2, awayTeam: 2 }),
    ).rejects.toBeInstanceOf(InvalidPairingError);
  });

  it("un partido con resultado no cambia de equipos", async () => {
    const { deps } = matchesOfEvent([groupMatch("m1", 1, 15)]);
    await expect(
      makeChangeMatchTeams(deps)({ eventId: "e", matchId: "m1", homeTeam: 2, awayTeam: 3 }),
    ).rejects.toBeInstanceOf(MatchAlreadyPlayedError);
  });

  it("la final la arma el organizador, y solo hay una", async () => {
    const { rows, deps } = matchesOfEvent([groupMatch("m1", 1, 15)]);
    await makeCreateFinal(deps)({ eventId: "e", homeTeam: 1, awayTeam: 3 });
    expect(rows.at(-1)).toMatchObject({ isFinal: true, homeTeam: 1, awayTeam: 3 });
    await expect(
      makeCreateFinal(deps)({ eventId: "e", homeTeam: 1, awayTeam: 2 }),
    ).rejects.toBeInstanceOf(FinalAlreadyExistsError);
  });

  it("subir un partido lo cambia de lugar con el anterior", async () => {
    const { rows, deps } = matchesOfEvent([groupMatch("m1", 1), groupMatch("m2", 2)]);
    await makeMoveMatch(deps)({ eventId: "e", matchId: "m2", direction: "up" });
    expect(rows.map((row) => [row.id, row.position])).toEqual([
      ["m1", 2],
      ["m2", 1],
    ]);
  });
});
