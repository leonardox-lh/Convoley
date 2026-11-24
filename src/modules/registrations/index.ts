import { db } from "@/lib/db";
import { makeListEventRegistrations } from "./application/list-event-registrations";
import { makeRegisterGuest } from "./application/register-guest";
import { eventsAdapter } from "./infrastructure/events-adapter";
import { prismaRegistrationListReader } from "./infrastructure/prisma-registration-reader";
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

export const listEventRegistrations = makeListEventRegistrations({
  registrations: prismaRegistrationListReader,
});

export type { RegisterGuestInput } from "./application/register-guest";
export {
  isOpenForRegistration,
  SEAT_HOLDING_STATUSES,
  seatSummary,
  type RegistrationStatus,
} from "./domain/registration";
export type { RegistrationListItem } from "./application/ports";
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
