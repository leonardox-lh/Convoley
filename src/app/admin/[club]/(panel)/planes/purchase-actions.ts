"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findClubBySlug } from "@/modules/clubs";
import {
  approvePlanVoucher,
  NothingToReviewError,
  PlanPurchaseNotFoundError,
  rejectPlanVoucher,
} from "@/modules/plans";
import { REJECTION_REASON_MAX_LENGTH } from "@/modules/registrations";
import { NOT_ALLOWED_MESSAGE } from "../../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../../require-organizer";

export type PurchaseActionState = { status: "idle" } | { status: "error"; message: string };

const purchaseSchema = z.object({ clubSlug: z.string().min(1), purchaseId: z.string().min(1) });
const rejectSchema = purchaseSchema.extend({
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo: el jugador lo verá.")
    .max(REJECTION_REASON_MAX_LENGTH, "El motivo es muy largo."),
});

/** HU-27: only admins review plan vouchers, as only they manage plans (HU-26). */
async function review(
  formData: FormData,
  work: (input: { clubId: string; purchaseId: string; reviewedByUserId: string }) => Promise<void>,
): Promise<PurchaseActionState> {
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, purchaseId } = parsed.data;
  const organizer = await requireOrganizerToEdit(clubSlug, "manage_club");
  const club = organizer ? await findClubBySlug(clubSlug) : null;
  if (!organizer || !club) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    await work({ clubId: club.id, purchaseId, reviewedByUserId: organizer.userId });
  } catch (error) {
    if (error instanceof PlanPurchaseNotFoundError || error instanceof NothingToReviewError) {
      return { status: "error", message: "Este plan ya no tiene una captura por revisar." };
    }
    throw error;
  }
  revalidatePath(`/admin/${clubSlug}/planes`);
  return { status: "idle" };
}

export async function approvePlanVoucherAction(
  _previous: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  return review(formData, approvePlanVoucher);
}

export async function rejectPlanVoucherAction(
  _previous: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  return review(formData, (input) => rejectPlanVoucher({ ...input, reason: parsed.data.reason }));
}
