"use server";

import { z } from "zod";
import { removeClubVenue } from "@/modules/events";
import { requireOrganizerToEdit } from "../require-organizer";
import { NOT_ALLOWED_MESSAGE } from "./event-form-schema";

const removeVenueSchema = z.object({
  clubSlug: z.string().min(1),
  venueId: z.string().min(1),
});

/** Takes a place off the club's list. Returns an error message, or null when it's gone. */
export async function removeVenueAction(input: {
  clubSlug: string;
  venueId: string;
}): Promise<string | null> {
  const parsed = removeVenueSchema.safeParse(input);
  if (!parsed.success) return "No se pudo eliminar el lugar.";
  if (!(await requireOrganizerToEdit(parsed.data.clubSlug, "manage_club"))) {
    return NOT_ALLOWED_MESSAGE;
  }
  await removeClubVenue(parsed.data);
  return null;
}
