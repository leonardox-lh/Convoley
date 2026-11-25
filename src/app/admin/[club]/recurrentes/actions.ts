"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRecurringEvent, setRecurringEventPaused } from "@/modules/events";
import {
  domainErrorMessage,
  NOT_ALLOWED_MESSAGE,
  recurringEventSchema,
} from "../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../require-organizer";

export type RecurringEventState =
  { status: "idle" } | { status: "created" } | { status: "error"; message: string };

const pauseSchema = z.object({
  clubSlug: z.string().min(1),
  recurringEventId: z.string().min(1),
  isPaused: z.enum(["true", "false"]).transform((value) => value === "true"),
});

async function run(clubSlug: string, work: () => Promise<void>): Promise<string | null> {
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) return NOT_ALLOWED_MESSAGE;
  try {
    await work();
  } catch (error) {
    const message = domainErrorMessage(error);
    if (message) return message;
    throw error;
  }
  revalidatePath(`/admin/${clubSlug}/recurrentes`);
  return null;
}

export async function createRecurringEventAction(
  _previous: RecurringEventState,
  formData: FormData,
): Promise<RecurringEventState> {
  const parsed = recurringEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const error = await run(parsed.data.clubSlug, async () => {
    await createRecurringEvent(parsed.data);
  });
  return error ? { status: "error", message: error } : { status: "created" };
}

export async function setPausedAction(
  _previous: RecurringEventState,
  formData: FormData,
): Promise<RecurringEventState> {
  const parsed = pauseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  const error = await run(parsed.data.clubSlug, () => setRecurringEventPaused(parsed.data));
  return error ? { status: "error", message: error } : { status: "idle" };
}
