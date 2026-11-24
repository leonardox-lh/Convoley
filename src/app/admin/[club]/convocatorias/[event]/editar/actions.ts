"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CANCELLATION_OUTCOMES,
  cancelEvent,
  updateEvent,
  type EventStatus,
} from "@/modules/events";
import {
  domainErrorMessage,
  eventDetailsSchema,
  NOT_ALLOWED_MESSAGE,
} from "../../event-form-schema";
import { requireOrganizer } from "../../../require-organizer";

export type UpdateEventState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; eventStatus: EventStatus };

export type CancelEventState = { status: "idle" } | { status: "error"; message: string };

const updateSchema = z.object({
  eventId: z.string().min(1),
  intent: z.enum(["save", "publish"]).default("save"),
});

const cancelSchema = z.object({
  clubSlug: z.string().min(1),
  eventId: z.string().min(1),
  outcome: z.enum(CANCELLATION_OUTCOMES, "Elige qué pasa con los pagos."),
});

export async function updateEventAction(
  _previous: UpdateEventState,
  formData: FormData,
): Promise<UpdateEventState> {
  const values = Object.fromEntries(formData);
  const details = eventDetailsSchema.safeParse(values);
  if (!details.success) return { status: "error", message: details.error.issues[0].message };
  const target = updateSchema.safeParse(values);
  if (!target.success) return { status: "error", message: "No encontramos la convocatoria." };
  if (!(await requireOrganizer(details.data.clubSlug))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }

  try {
    const { status } = await updateEvent({
      ...details.data,
      eventId: target.data.eventId,
      publish: target.data.intent === "publish",
    });
    return { status: "saved", eventStatus: status };
  } catch (error) {
    const message = domainErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
}

export async function cancelEventAction(
  _previous: CancelEventState,
  formData: FormData,
): Promise<CancelEventState> {
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  if (!(await requireOrganizer(parsed.data.clubSlug))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }

  try {
    await cancelEvent(parsed.data);
  } catch (error) {
    const message = domainErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  // Reload the page so it shows the cancelled state instead of the forms.
  redirect(`/admin/${parsed.data.clubSlug}/convocatorias/${parsed.data.eventId}/editar`);
}
