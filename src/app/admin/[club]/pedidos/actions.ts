"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findClubBySlug } from "@/modules/clubs";
import { REJECTION_REASON_MAX_LENGTH } from "@/modules/registrations";
import {
  approveOrderVoucher,
  markOrderDelivered,
  NothingToReviewError,
  OrderNotFoundError,
  OrderStatusError,
  OutOfStockError,
  rejectOrderVoucher,
} from "@/modules/store";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../require-organizer";

export type OrderActionState = { status: "idle" } | { status: "error"; message: string };

const orderSchema = z.object({ clubSlug: z.string().min(1), orderId: z.string().min(1) });
const rejectSchema = orderSchema.extend({
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo: el jugador lo verá.")
    .max(REJECTION_REASON_MAX_LENGTH, "El motivo es muy largo."),
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [OrderNotFoundError, "No encontramos ese pedido. Recarga la página."],
  [OrderStatusError, "El pedido cambió de estado. Recarga la página."],
  [NothingToReviewError, "Este pedido ya no tiene una captura por revisar."],
  [
    OutOfStockError,
    "Ya no hay stock para este pedido. Recházalo y devuélvele el dinero al jugador por Yape.",
  ],
];

/** Admins and helpers manage orders (deliveries happen at the court). */
async function run(
  formData: FormData,
  schema: typeof orderSchema | typeof rejectSchema,
  work: (input: {
    clubId: string;
    orderId: string;
    userId: string;
    reason?: string;
  }) => Promise<void>,
): Promise<OrderActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, orderId } = parsed.data;
  const organizer = await requireOrganizerToEdit(clubSlug, "run_game_day");
  const club = organizer && (await findClubBySlug(clubSlug));
  if (!club) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    await work({
      clubId: club.id,
      orderId,
      userId: organizer.userId,
      reason: (parsed.data as { reason?: string }).reason,
    });
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  revalidatePath(`/admin/${clubSlug}/pedidos`);
  return { status: "idle" };
}

export async function approveOrderVoucherAction(_previous: OrderActionState, formData: FormData) {
  return run(formData, orderSchema, ({ clubId, orderId, userId }) =>
    approveOrderVoucher({ clubId, orderId, reviewedByUserId: userId }),
  );
}

export async function rejectOrderVoucherAction(_previous: OrderActionState, formData: FormData) {
  return run(formData, rejectSchema, ({ clubId, orderId, userId, reason }) =>
    rejectOrderVoucher({ clubId, orderId, reviewedByUserId: userId, reason: reason! }),
  );
}

export async function markOrderDeliveredAction(_previous: OrderActionState, formData: FormData) {
  return run(formData, orderSchema, ({ clubId, orderId }) =>
    markOrderDelivered({ clubId, orderId }),
  );
}
