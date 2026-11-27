"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { findClubBySlug } from "@/modules/clubs";
import { currentUserId, signIn } from "@/modules/identity";
import { buyPlan, PlanAlreadyOpenError, PlanNotFoundError } from "@/modules/plans";
import { InvalidPhoneNumberError, PhoneNumber } from "@/modules/registrations";
import { nameField, PHONE_FORMAT_MESSAGE } from "../../player-schema";

export type BuyPlanState =
  | { status: "idle" }
  | { status: "error"; message: string }
  // Shown as a toast; `shownAt` makes a repeated attempt show it again.
  | { status: "blocked"; message: string; shownAt: number };

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
  // The plan belongs to a Google account: a phone alone would let anyone use it.
  const userId = await currentUserId();
  if (!userId) return { status: "error", message: "Entra con Google para comprar un plan." };

  let purchaseId: string;
  try {
    ({ id: purchaseId } = await buyPlan({
      clubId: club.id,
      planId,
      buyer: {
        firstName,
        lastName,
        phone: PhoneNumber.parse(phone).value,
        userId,
      },
    }));
  } catch (error) {
    if (error instanceof InvalidPhoneNumberError) {
      return { status: "error", message: PHONE_FORMAT_MESSAGE };
    }
    if (error instanceof PlanAlreadyOpenError) {
      return {
        status: "blocked",
        message:
          "Ya tienes un plan vigente o en revisión en este club. Solo puedes tener uno a la vez.",
        shownAt: Date.now(),
      };
    }
    if (error instanceof PlanNotFoundError) {
      return { status: "error", message: "Este plan ya no se ofrece. Recarga la página." };
    }
    throw error;
  }
  redirect(`/plan/${encodeURIComponent(purchaseId)}`);
}

/** HU-27: buying a plan needs a Google account; come back to the club's plans after. */
export async function signInToBuyPlanAction(formData: FormData): Promise<void> {
  const clubSlug = z.string().min(1).parse(formData.get("clubSlug"));
  await signIn("google", { redirectTo: `/${encodeURIComponent(clubSlug)}/planes` });
}
