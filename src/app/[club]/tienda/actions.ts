"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { findClubBySlug } from "@/modules/clubs";
import { currentUserId } from "@/modules/identity";
import { InvalidPhoneNumberError, PhoneNumber } from "@/modules/registrations";
import {
  createOrder,
  InvalidCartError,
  MAX_QUANTITY_PER_ITEM,
  PickupEventNotAvailableError,
} from "@/modules/store";
import { nameField, PHONE_FORMAT_MESSAGE } from "../../player-schema";

export type OrderState = { status: "idle" } | { status: "error"; message: string };

const orderSchema = z.object({
  clubSlug: z.string().min(1),
  pickupEventId: z.string().min(1, "Elige en qué convocatoria lo recoges."),
  firstName: nameField("Escribe tu nombre."),
  lastName: nameField("Escribe tu apellido."),
  phone: z.string().trim().min(1, "Escribe tu celular."),
  // The cart travels as JSON from the browser; only ids and quantities are trusted from it.
  cart: z
    .string()
    .transform((raw, context) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Tu carrito está vacío." });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(
          z.object({
            variantId: z.string().min(1),
            quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
          }),
        )
        .min(1, "Tu carrito está vacío."),
    ),
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidPhoneNumberError, PHONE_FORMAT_MESSAGE],
  [PickupEventNotAvailableError, "Esa convocatoria ya no está disponible para recoger."],
];

const CART_MESSAGES = {
  empty: "Tu carrito está vacío.",
  quantity: `Puedes pedir de 1 a ${MAX_QUANTITY_PER_ITEM} unidades por talla.`,
  unavailable: "Un producto de tu carrito ya no está a la venta. Recarga la página.",
  out_of_stock: "No queda stock suficiente de un producto de tu carrito.",
} as const;

/** HU-24: the cart becomes an order and the player goes to pay it. */
export async function placeOrderAction(
  _previous: OrderState,
  formData: FormData,
): Promise<OrderState> {
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, pickupEventId, firstName, lastName, phone, cart } = parsed.data;
  // Orders need an account so the buyer can find them again in Mis pedidos.
  const userId = await currentUserId();
  if (!userId) return { status: "error", message: "Debes iniciar sesión para comprar." };
  const club = await findClubBySlug(clubSlug);
  if (!club) return { status: "error", message: "No encontramos este club." };

  let orderId: string;
  try {
    ({ id: orderId } = await createOrder({
      club,
      pickupEventId,
      buyer: {
        firstName,
        lastName,
        phone: PhoneNumber.parse(phone).value,
        userId,
      },
      lines: cart,
    }));
  } catch (error) {
    if (error instanceof InvalidCartError) {
      return { status: "error", message: CART_MESSAGES[error.reason] };
    }
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  redirect(`/pedido/${encodeURIComponent(orderId)}`);
}
