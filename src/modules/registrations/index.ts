import { db } from "@/lib/db";
import { makeAddPlayerManually } from "./application/add-player-manually";
import { makeListEventRegistrations } from "./application/list-event-registrations";
import { makeMarkPaidManually } from "./application/mark-paid-manually";
import {
  makeLinkGuestRegistrations,
  makeListPlayerRegistrations,
} from "./application/player-registrations";
import { makeRegisterGuest } from "./application/register-guest";
import { makeRemoveRegistration } from "./application/remove-registration";
import { eventsAdapter } from "./infrastructure/events-adapter";
import { paymentsAdapter } from "./infrastructure/payments-adapter";
import {
  prismaPlayerRegistrations,
  prismaRegistrationListReader,
} from "./infrastructure/prisma-registration-reader";
import {
  prismaRegistrationRepository,
  prismaTransactions,
} from "./infrastructure/prisma-registration-repository";

const transactions = prismaTransactions(db);
const now = () => new Date();

export const registerGuest = makeRegisterGuest({
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  transactions,
  now,
});

export const addPlayerManually = makeAddPlayerManually({
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  payments: paymentsAdapter,
  transactions,
  now,
});

export const markPaidManually = makeMarkPaidManually({
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  payments: paymentsAdapter,
  transactions,
});

export const removeRegistration = makeRemoveRegistration({
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  transactions,
});

export const listEventRegistrations = makeListEventRegistrations({
  registrations: prismaRegistrationListReader,
});

export const linkGuestRegistrations = makeLinkGuestRegistrations({
  registrations: prismaPlayerRegistrations,
});
export const listPlayerRegistrations = makeListPlayerRegistrations({
  registrations: prismaPlayerRegistrations,
});

export { PhoneNumber } from "./domain/phone-number";
export type { RegisterGuestInput } from "./application/register-guest";
export {
  acceptsWaitlist,
  isOpenForRegistration,
  PLAYER_LEVELS,
  PLAYER_POSITIONS,
  type PlayerLevel,
  type PlayerPosition,
  SEAT_HOLDING_STATUSES,
  seatSummary,
  type RegistrationStatus,
} from "./domain/registration";
export {
  DuplicateRegistrationError,
  EventFullError,
  EventNotOpenError,
  InvalidPhoneNumberError,
  RegistrationNotFoundError,
} from "./domain/errors";
export {
  promoteWaitlisted,
  countConfirmedRegistrations,
  countConfirmedRegistrationsByEvent,
  listEventRegistrationIds,
} from "./infrastructure/prisma-registration-reader";
