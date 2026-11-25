"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { findClubBySlug } from "@/modules/clubs";
import { currentUserId } from "@/modules/identity";
import { buyPlan, PlanNotFoundError } from "@/modules/plans";
import { InvalidPhoneNumberError, PhoneNumber } from "@/modules/registrations";
import { nameField, PHONE_FORMAT_MESSAGE } from "../../player-schema";

export type BuyPlanState = { status: "idle" } | { status: "error"; message: string };

const buyPlanSchema = z.object({
  clubSlug: z.string().min(1),
  planId: z.string().min(1),
  firstName: nameField("Escribe tu nombre."),
  lastName: nameField("Escribe tu apellido."),
  phone: z.string().trim().min(1, "Escribe tu celular."),
});

/** HU-27: the player picks a plan and goes to pay it. */
export async function buyPlanAction(
  _previous: BuyPlanState,
  formData: FormData,
): Promise<BuyPlanState> {
  const parsed = buyPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, planId, firstName, lastName, phone } = parsed.data;
  const club = await findClubBySlug(clubSlug);
  if (!club) return { status: "error", message: "No encontramos este club." };

  let purchaseId: string;
  try {
    ({ id: purchaseId } = await buyPlan({
      clubId: club.id,
      planId,
      buyer: {
        firstName,
        lastName,
        phone: PhoneNumber.parse(phone).value,
        userId: await currentUserId(),
      },
    }));
  } catch (error) {
    if (error instanceof InvalidPhoneNumberError) {
      return { status: "error", message: PHONE_FORMAT_MESSAGE };
    }
    if (error instanceof PlanNotFoundError) {
      return { status: "error", message: "Este plan ya no se ofrece. Recarga la página." };
    }
    throw error;
  }
  redirect(`/plan/${encodeURIComponent(purchaseId)}`);
}
