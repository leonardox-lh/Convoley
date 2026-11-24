import { db } from "@/lib/db";
import { makeRegisterGuest } from "./application/register-guest";
import { eventsAdapter } from "./infrastructure/events-adapter";
import {
  prismaRegistrationRepository,
  prismaTransactions,
} from "./infrastructure/prisma-registration-repository";

export const registerGuest = makeRegisterGuest({
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  transactions: prismaTransactions(db),
  now: () => new Date(),
});

export type { RegisterGuestInput } from "./application/register-guest";
export { isOpenForRegistration, SEAT_HOLDING_STATUSES } from "./domain/registration";
export {
  DuplicateRegistrationError,
  EventFullError,
  EventNotOpenError,
  InvalidPhoneNumberError,
} from "./domain/errors";
export {
  countConfirmedRegistrations,
  countConfirmedRegistrationsByEvent,
  listEventRegistrationIds,
} from "./infrastructure/prisma-registration-reader";
