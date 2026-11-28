"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEvent } from "@/modules/events";
import { domainErrorMessage, eventDetailsSchema, NOT_ALLOWED_MESSAGE } from "../event-form-schema";
import { requireOrganizerToEdit } from "../../require-organizer";

export type CreateEventState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "created";
      sharePath: string;
      editPath: string;
      flyerPath: string;
      published: boolean;
    };

const intentSchema = z.object({ intent: z.enum(["draft", "published"]) });

export async function createEventAction(
  _previous: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const values = Object.fromEntries(formData);
  const details = eventDetailsSchema.safeParse(values);
  if (!details.success) return { status: "error", message: details.error.issues[0].message };
  if (!(await requireOrganizerToEdit(details.data.clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  const intent = intentSchema.safeParse(values);
  if (!intent.success) return { status: "error", message: "Elige publicar o guardar borrador." };

  try {
    const { id, sharePath } = await createEvent({ ...details.data, status: intent.data.intent });
    // The panel's hero counts open events and free spots: refetch it and the list on the way back.
    revalidatePath(`/admin/${details.data.clubSlug}`, "layout");
    return {
      status: "created",
      sharePath,
      editPath: `/admin/${details.data.clubSlug}/convocatorias/${id}/editar`,
      flyerPath: `/admin/${details.data.clubSlug}/convocatorias/${id}/flyer`,
      published: intent.data.intent === "published",
    };
  } catch (error) {
    const message = domainErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
}
