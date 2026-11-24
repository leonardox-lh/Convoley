"use server";

import { z } from "zod";
import { limaDateTimeToUtc } from "@/lib/lima-time";
import { solesToCents } from "@/lib/money";
import {
  ClubNotFoundError,
  CommunityNotInClubError,
  createEvent,
  EventInPastError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidPriceError,
} from "@/modules/events";
import { isEventCreationEnabled } from "./organizer-access";

export type CreateEventState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "created"; sharePath: string; published: boolean };

const TITLE_MAX_LENGTH = 80;
const VENUE_MAX_LENGTH = 120;
const URL_MAX_LENGTH = 500;
const RULES_MAX_LENGTH = 500;
// Far above any real court; keeps the value inside a Postgres Int.
const MAX_CAPACITY = 1000;
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const createEventSchema = z.object({
  clubSlug: z.string().min(1),
  communityId: z.string().min(1, "Elige el nivel."),
  title: z.string().trim().min(1, "Ponle un nombre a la convocatoria.").max(TITLE_MAX_LENGTH),
  date: z.iso.date("Elige la fecha."),
  time: z.string().regex(TIME_FORMAT, "Elige la hora."),
  venueName: z.string().trim().min(1, "Indica el lugar.").max(VENUE_MAX_LENGTH),
  mapsUrl: optionalText(URL_MAX_LENGTH),
  price: z.string().transform((value, ctx) => {
    const cents = solesToCents(value);
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: "Escribe el precio en soles, por ejemplo 15 o 12.50.",
      });
      return z.NEVER;
    }
    return cents;
  }),
  capacity: z.coerce
    .number("Escribe cuántos cupos hay.")
    .max(MAX_CAPACITY, `Puedes abrir hasta ${MAX_CAPACITY} cupos.`),
  isMixed: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
  rules: optionalText(RULES_MAX_LENGTH),
  intent: z.enum(["draft", "published"]),
});

const DOMAIN_ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [EventInPastError, "La fecha y hora deben ser futuras."],
  [InvalidCapacityError, "Los cupos deben ser un número entero mayor que 0."],
  [InvalidPriceError, "El precio no puede ser negativo."],
  [InvalidMapsUrlError, "Pega un link de Google Maps (por ejemplo, https://maps.app.goo.gl/...)."],
  [CommunityNotInClubError, "Elige un nivel de tu club."],
  [ClubNotFoundError, "No encontramos el club."],
];

export async function createEventAction(
  _previous: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  if (!isEventCreationEnabled())
    return { status: "error", message: "Inicia sesión para continuar." };

  const parsed = createEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { date, time, price, intent, ...fields } = parsed.data;
  try {
    const { sharePath } = await createEvent({
      ...fields,
      startsAt: limaDateTimeToUtc(date, time),
      priceCents: price,
      status: intent,
    });
    return { status: "created", sharePath, published: intent === "published" };
  } catch (error) {
    const known = DOMAIN_ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
}
