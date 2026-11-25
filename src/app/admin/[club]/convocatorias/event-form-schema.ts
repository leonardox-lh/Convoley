import { z } from "zod";
import { limaDateTimeToUtc } from "@/lib/lima-time";
import { solesToCents } from "@/lib/money";
import {
  CapacityBelowConfirmedError,
  ClubNotFoundError,
  CommunityNotInClubError,
  EventAlreadyCancelledError,
  EventEndsBeforeStartError,
  EventInPastError,
  EventNotEditableError,
  EventNotFoundError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidPriceError,
  InvalidRecurrenceError,
  MAX_PUBLISH_DAYS_BEFORE,
  RecurringEventNotFoundError,
} from "@/modules/events";

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

const eventFieldsObject = z.object({
  clubSlug: z.string().min(1),
  communityId: z.string().min(1, "Elige el nivel."),
  title: z.string().trim().min(1, "Ponle un nombre a la convocatoria.").max(TITLE_MAX_LENGTH),
  date: z.iso.date("Elige la fecha."),
  time: z.string().regex(TIME_FORMAT, "Elige la hora de inicio."),
  endTime: z.string().regex(TIME_FORMAT, "Elige la hora de fin."),
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
  showRoster: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
  rules: optionalText(RULES_MAX_LENGTH),
});

/** The event fields shared by the create and edit forms, already turned into domain values. */
export const eventDetailsSchema = eventFieldsObject.transform(
  ({ date, time, endTime, price, ...fields }) => ({
    ...fields,
    startsAt: limaDateTimeToUtc(date, time),
    endsAt: limaDateTimeToUtc(date, endTime),
    priceCents: price,
  }),
);

const MINUTES_PER_HOUR = 60;
const minuteOfDay = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
};

/** HU-28: the same fields with a weekday instead of a date. */
export const recurringEventSchema = eventFieldsObject
  .omit({ date: true })
  .extend({
    weekday: z.coerce.number().int().min(0).max(6, "Elige el día."),
    publishDaysBefore: z.coerce
      .number("Indica cuántos días antes se publica.")
      .int("Indica cuántos días antes se publica.")
      .min(0, `Publica entre 0 y ${MAX_PUBLISH_DAYS_BEFORE} días antes.`)
      .max(MAX_PUBLISH_DAYS_BEFORE, `Publica entre 0 y ${MAX_PUBLISH_DAYS_BEFORE} días antes.`),
  })
  .transform(({ time, endTime, price, ...fields }) => ({
    ...fields,
    startMinute: minuteOfDay(time),
    endMinute: minuteOfDay(endTime),
    priceCents: price,
  }));

const DOMAIN_ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [EventInPastError, "La fecha y hora deben ser futuras."],
  [EventEndsBeforeStartError, "La hora de fin debe ser después de la hora de inicio."],
  [InvalidCapacityError, "Los cupos deben ser un número entero mayor que 0."],
  [CapacityBelowConfirmedError, "No puedes dejar menos cupos que jugadores inscritos."],
  [InvalidPriceError, "El precio no puede ser negativo."],
  [InvalidMapsUrlError, "Pega un link de Google Maps (por ejemplo, https://maps.app.goo.gl/...)."],
  [CommunityNotInClubError, "Elige un nivel de tu club."],
  [ClubNotFoundError, "No encontramos el club."],
  [EventNotFoundError, "No encontramos la convocatoria."],
  [EventNotEditableError, "Esta convocatoria ya no se puede editar."],
  [EventAlreadyCancelledError, "Esta convocatoria ya está cancelada."],
  [InvalidRecurrenceError, "Revisa el día, la hora y los días de anticipación."],
  [RecurringEventNotFoundError, "No encontramos esa convocatoria recurrente."],
];

/** The message to show for a business rule error, or null if the error is unexpected. */
export function domainErrorMessage(error: unknown): string | null {
  return DOMAIN_ERROR_MESSAGES.find(([type]) => error instanceof type)?.[1] ?? null;
}

export const NOT_ALLOWED_MESSAGE = "No tienes permiso para administrar este club.";
