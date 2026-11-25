"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { solesToCents } from "@/lib/money";
import { findClubBySlug } from "@/modules/clubs";
import {
  createPlan,
  InvalidPlanError,
  MAX_PLAN_CREDITS,
  MAX_PLAN_VALIDITY_DAYS,
  PLAN_NAME_MAX_LENGTH,
  PlanNotFoundError,
  setPlanActive,
  type InvalidPlanReason,
} from "@/modules/plans";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizer } from "../require-organizer";

export type PlanActionState = { status: "idle" | "created" } | { status: "error"; message: string };

const TERMS_MESSAGE = `Pon el número de fechas (hasta ${MAX_PLAN_CREDITS}), la vigencia en días (hasta ${MAX_PLAN_VALIDITY_DAYS}) o ambos.`;
// An empty optional number field means "not set".
const optionalCount = (max: number) =>
  z.preprocess(
    (raw) => (raw === "" || raw === undefined ? null : raw),
    z.coerce.number().int(TERMS_MESSAGE).min(1, TERMS_MESSAGE).max(max, TERMS_MESSAGE).nullable(),
  );

const planSchema = z.object({
  clubSlug: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre.")
    .max(PLAN_NAME_MAX_LENGTH, "Ese nombre es muy largo."),
  price: z
    .string()
    .transform((raw) => solesToCents(raw))
    .refine((cents) => cents !== null && cents > 0, "Escribe un precio válido, como 50 o 49.90."),
  creditCount: optionalCount(MAX_PLAN_CREDITS),
  validityDays: optionalCount(MAX_PLAN_VALIDITY_DAYS),
});

const PLAN_MESSAGES: Record<InvalidPlanReason, string> = {
  name: "Escribe un nombre de hasta 60 letras.",
  price: "Escribe un precio mayor que 0.",
  terms: TERMS_MESSAGE,
  communities: "Elige al menos una comunidad donde vale el plan.",
};

/** Plans are part of the club's prices, so only its admin manages them. */
async function adminClub(clubSlug: string) {
  if ((await requireOrganizer(clubSlug))?.role !== "admin") return null;
  return findClubBySlug(clubSlug);
}

export async function createPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const club = await adminClub(parsed.data.clubSlug);
  if (!club) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  const communityIds = z.array(z.string().min(1)).parse(formData.getAll("communityIds"));

  try {
    await createPlan({
      club,
      plan: {
        name: parsed.data.name,
        priceCents: parsed.data.price!,
        creditCount: parsed.data.creditCount,
        validityDays: parsed.data.validityDays,
        communityIds,
      },
    });
  } catch (error) {
    if (error instanceof InvalidPlanError) {
      return { status: "error", message: PLAN_MESSAGES[error.reason] };
    }
    throw error;
  }
  revalidatePath(`/admin/${club.slug}/planes`);
  return { status: "created" };
}

const toggleSchema = z.object({
  clubSlug: z.string().min(1),
  planId: z.string().min(1),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function togglePlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos ese plan." };
  const club = await adminClub(parsed.data.clubSlug);
  if (!club) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    await setPlanActive({
      clubId: club.id,
      planId: parsed.data.planId,
      isActive: parsed.data.isActive,
    });
  } catch (error) {
    if (error instanceof PlanNotFoundError) {
      return { status: "error", message: "No encontramos ese plan. Recarga la página." };
    }
    throw error;
  }
  revalidatePath(`/admin/${club.slug}/planes`);
  return { status: "idle" };
}
