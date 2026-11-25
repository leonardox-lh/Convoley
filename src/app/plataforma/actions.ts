"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  recordSubscriptionPayment,
  setClubSuspended,
  StaleSubscriptionError,
} from "@/modules/billing";
import { requirePlatformAdmin } from "./require-platform-admin";

const PLATFORM_PATH = "/plataforma";

const paymentSchema = z.object({
  clubId: z.string().min(1),
  // ISO date the page showed, or "" when the club never paid: guards against double clicks.
  expectedPaidUntil: z.union([z.literal(""), z.iso.datetime()]),
});
const suspendSchema = z.object({
  clubId: z.string().min(1),
  suspended: z.enum(["true", "false"]),
});

export async function recordPaymentAction(formData: FormData) {
  const recordedByUserId = await requirePlatformAdmin();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { clubId, expectedPaidUntil } = parsed.data;
  try {
    await recordSubscriptionPayment({
      clubId,
      expectedPaidUntil: expectedPaidUntil ? new Date(expectedPaidUntil) : null,
      recordedByUserId,
    });
  } catch (error) {
    // Already recorded by another click or tab: the reloaded page shows the current date.
    if (!(error instanceof StaleSubscriptionError)) throw error;
  }
  revalidatePath(PLATFORM_PATH);
}

export async function setSuspendedAction(formData: FormData) {
  await requirePlatformAdmin();
  const parsed = suspendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setClubSuspended({
    clubId: parsed.data.clubId,
    suspended: parsed.data.suspended === "true",
  });
  revalidatePath(PLATFORM_PATH);
}
