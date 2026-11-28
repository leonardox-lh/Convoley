"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InvalidLogoTypeError, LogoTooLargeError, MAX_LOGO_BYTES } from "@/modules/clubs";
import { getOrganizerEvent } from "@/modules/events";
import {
  addMatch,
  changeMatchTeams,
  createFinal,
  deleteMatch,
  FinalAlreadyExistsError,
  InvalidMatchScoreError,
  InvalidPairingError,
  MatchAlreadyPlayedError,
  moveMatch,
  InvalidTeamCountError,
  MatchNotFoundError,
  MAX_MATCH_SCORE,
  NoChampionYetError,
  recordMatchScore,
  setChampionPhoto,
  startGameDay,
} from "@/modules/registrations";
import { NOT_ALLOWED_MESSAGE } from "../../event-form-schema";
import { requireOrganizerToEdit } from "../../../require-organizer";

export type GameDayState = { status: "idle" } | { status: "error"; message: string };

const targetSchema = z.object({ clubSlug: z.string().min(1), eventId: z.string().min(1) });
const score = z.coerce.number().int().min(0).max(MAX_MATCH_SCORE);
const scoreSchema = targetSchema.extend({
  matchId: z.string().min(1),
  homeScore: score,
  awayScore: score,
});

/** Game day: admin and helper, like the teams; only events of their club. */
async function authorize(target: z.infer<typeof targetSchema>) {
  if (!(await requireOrganizerToEdit(target.clubSlug, "run_game_day"))) return false;
  return (await getOrganizerEvent(target)) !== null;
}

const gameDayPath = (target: z.infer<typeof targetSchema>) =>
  `/admin/${target.clubSlug}/convocatorias/${target.eventId}/partidos`;

export async function startGameDayAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(await authorize(parsed.data))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  try {
    await startGameDay(parsed.data.eventId);
  } catch (error) {
    if (error instanceof InvalidTeamCountError) {
      return { status: "error", message: "Primero arma al menos 2 equipos." };
    }
    throw error;
  }
  revalidatePath(gameDayPath(parsed.data));
  return { status: "idle" };
}

export async function recordScoreAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: `Pon los dos puntajes, de 0 a ${MAX_MATCH_SCORE}.` };
  }
  if (!(await authorize(parsed.data))) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    await recordMatchScore(parsed.data);
  } catch (error) {
    if (error instanceof InvalidMatchScoreError) {
      return { status: "error", message: "En vóley no hay empate: un equipo tiene que ganar." };
    }
    if (error instanceof MatchNotFoundError) {
      return { status: "error", message: "Ese partido ya no existe. Recarga la página." };
    }
    throw error;
  }
  revalidatePath(gameDayPath(parsed.data));
  return { status: "idle" };
}

const photoSchema = targetSchema.extend({
  photo: z
    .instanceof(File, { message: "Elige una foto." })
    .refine((file) => file.size > 0, "Elige una foto.")
    .refine((file) => file.size <= MAX_LOGO_BYTES, "La foto puede pesar hasta 2 MB."),
});

/** The champion team's photo, shown big on the champion banner. */
export async function uploadChampionPhotoAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  const parsed = photoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Elige una foto." };
  }
  if (!(await authorize(parsed.data))) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  const { photo, ...target } = parsed.data;
  try {
    await setChampionPhoto({
      ...target,
      image: { bytes: new Uint8Array(await photo.arrayBuffer()), contentType: photo.type },
    });
  } catch (error) {
    if (error instanceof NoChampionYetError) {
      return { status: "error", message: "Primero guarda el resultado de la final." };
    }
    if (error instanceof InvalidLogoTypeError) {
      return { status: "error", message: "Sube una foto JPG, PNG o WebP." };
    }
    if (error instanceof LogoTooLargeError) {
      return { status: "error", message: "La foto puede pesar hasta 2 MB." };
    }
    throw error;
  }
  revalidatePath(gameDayPath(target));
  return { status: "idle" };
}

const teamNumber = z.coerce.number().int().min(1);
const pairingSchema = targetSchema.extend({ homeTeam: teamNumber, awayTeam: teamNumber });
const matchSchema = targetSchema.extend({ matchId: z.string().min(1) });

const MATCH_ERRORS: [new (...args: never[]) => Error, string][] = [
  [InvalidPairingError, "Elige dos equipos distintos."],
  [MatchAlreadyPlayedError, "Ese partido ya tiene resultado: elimínalo y agrega otro."],
  [FinalAlreadyExistsError, "Ya hay una final."],
  [MatchNotFoundError, "Ese partido ya no existe. Recarga la página."],
];

/** Authorizes, runs the change and refreshes the page; known rule errors become messages. */
async function changeMatches<T extends z.infer<typeof targetSchema>>(
  parsed: { success: true; data: T } | { success: false },
  work: (data: T) => Promise<void>,
): Promise<GameDayState> {
  if (!parsed.success || !(await authorize(parsed.data))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  try {
    await work(parsed.data);
  } catch (error) {
    const known = MATCH_ERRORS.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  revalidatePath(gameDayPath(parsed.data));
  return { status: "idle" };
}

export async function addMatchAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  return changeMatches(pairingSchema.safeParse(Object.fromEntries(formData)), addMatch);
}

export async function createFinalAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  return changeMatches(pairingSchema.safeParse(Object.fromEntries(formData)), createFinal);
}

export async function changeMatchTeamsAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  const schema = pairingSchema.extend({ matchId: z.string().min(1) });
  return changeMatches(schema.safeParse(Object.fromEntries(formData)), changeMatchTeams);
}

export async function deleteMatchAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  return changeMatches(matchSchema.safeParse(Object.fromEntries(formData)), deleteMatch);
}

export async function moveMatchAction(
  _previous: GameDayState,
  formData: FormData,
): Promise<GameDayState> {
  const schema = matchSchema.extend({ direction: z.enum(["up", "down"]) });
  return changeMatches(schema.safeParse(Object.fromEntries(formData)), moveMatch);
}
