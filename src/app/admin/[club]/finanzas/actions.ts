"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { solesToCents } from "@/lib/money";
import { EventNotFoundError, InvalidCourtCostError, setCourtCost } from "@/modules/events";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../require-organizer";

export type CourtCostState =
  { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

const INVALID_COST_MESSAGE = "Escribe el costo en soles, por ejemplo 120 o 120.50.";

const courtCostSchema = z.object({
  clubSlug: z.string().min(1),
  eventId: z.string().min(1),
  // Empty clears the cost.
  courtCost: z
    .string()
    .trim()
    .transform((raw, context) => {
      if (raw === "") return null;
      const cents = solesToCents(raw);
      if (cents === null) {
        context.addIssue({ code: "custom", message: INVALID_COST_MESSAGE });
        return z.NEVER;
      }
      return cents;
    }),
});

/** HU-34: records what the court of an event cost. */
export async function setCourtCostAction(
  _previous: CourtCostState,
  formData: FormData,
): Promise<CourtCostState> {
  const parsed = courtCostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, eventId, courtCost } = parsed.data;
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  try {
    await setCourtCost({ clubSlug, eventId, courtCostCents: courtCost });
  } catch (error) {
    if (error instanceof InvalidCourtCostError) {
      return { status: "error", message: INVALID_COST_MESSAGE };
    }
    if (error instanceof EventNotFoundError) {
      return { status: "error", message: "Esa convocatoria ya no existe." };
    }
    throw error;
  }
  revalidatePath(`/admin/${clubSlug}/finanzas`);
  return { status: "saved" };
}
