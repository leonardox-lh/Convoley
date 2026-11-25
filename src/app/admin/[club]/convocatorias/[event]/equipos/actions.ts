"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import {
  buildEventTeams,
  InvalidTeamCountError,
  MAX_TEAMS,
  MIN_TEAMS,
  moveToTeam,
  NotEnoughWomenError,
} from "@/modules/registrations";
import { NOT_ALLOWED_MESSAGE } from "../../event-form-schema";
import { requireOrganizerToEdit } from "../../../require-organizer";

export type TeamsState = { status: "idle" } | { status: "error"; message: string };

const targetSchema = z.object({ clubSlug: z.string().min(1), eventId: z.string().min(1) });
const buildSchema = targetSchema.extend({
  teamCount: z.coerce.number().int().min(MIN_TEAMS).max(MAX_TEAMS),
  // Only sent for mixed events.
  minWomenPerTeam: z.coerce.number().int().min(0).max(6).default(0),
});
const moveSchema = targetSchema.extend({
  registrationId: z.string().min(1),
  teamNumber: z
    .string()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().min(1).max(MAX_TEAMS).nullable()),
});

/** HU-31: admin and helper; only events of their club. */
async function authorize(target: z.infer<typeof targetSchema>) {
  if (!(await requireOrganizerToEdit(target.clubSlug, "run_game_day"))) return false;
  return (await getOrganizerEvent(target)) !== null;
}

const teamsPath = (target: z.infer<typeof targetSchema>) =>
  `/admin/${target.clubSlug}/convocatorias/${target.eventId}/equipos`;

export async function buildTeamsAction(
  _previous: TeamsState,
  formData: FormData,
): Promise<TeamsState> {
  const parsed = buildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: `Elige de ${MIN_TEAMS} a ${MAX_TEAMS} equipos.` };
  }
  if (!(await authorize(parsed.data))) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    await buildEventTeams(parsed.data);
  } catch (error) {
    if (error instanceof NotEnoughWomenError) {
      return {
        status: "error",
        message: `Hacen falta ${error.needed} chicas y hay ${error.available}. Baja el mínimo o el número de equipos.`,
      };
    }
    if (error instanceof InvalidTeamCountError) {
      return { status: "error", message: "No puede haber más equipos que jugadores." };
    }
    throw error;
  }
  revalidatePath(teamsPath(parsed.data));
  return { status: "idle" };
}

export async function moveToTeamAction(formData: FormData): Promise<void> {
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(await authorize(parsed.data))) return;
  await moveToTeam(parsed.data);
  revalidatePath(teamsPath(parsed.data));
}
