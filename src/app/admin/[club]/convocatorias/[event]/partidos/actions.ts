"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import {
  InvalidMatchScoreError,
  InvalidTeamCountError,
  MatchNotFoundError,
  MAX_MATCH_SCORE,
  recordMatchScore,
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
