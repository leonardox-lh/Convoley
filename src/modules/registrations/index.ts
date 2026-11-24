import { db } from "@/lib/db";
import { makeAddPlayerManually } from "./application/add-player-manually";
import { makeListEventRegistrations } from "./application/list-event-registrations";
import { makeMarkPaidManually } from "./application/mark-paid-manually";
import {
  makeLinkGuestRegistrations,
  makeListPlayerRegistrations,
} from "./application/player-registrations";
import { makeApproveVoucher, makeRejectVoucher } from "./application/review-voucher";
import { makeSubmitVoucher } from "./application/submit-voucher";
import { makeRegisterGuest } from "./application/register-guest";
import { makeRemoveRegistration } from "./application/remove-registration";
import { eventsAdapter } from "./infrastructure/events-adapter";
import {
  paymentsAdapter,
  voucherPaymentsAdapter,
  voucherReviewsAdapter,
} from "./infrastructure/payments-adapter";
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

export const submitVoucher = makeSubmitVoucher({
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  vouchers: voucherPaymentsAdapter,
  transactions,
});

const reviewDeps = {
  events: eventsAdapter,
  registrations: prismaRegistrationRepository,
  reviews: voucherReviewsAdapter,
  transactions,
  now,
};
export const approveVoucher = makeApproveVoucher(reviewDeps);
export const rejectVoucher = makeRejectVoucher(reviewDeps);

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
export { buildRoster, rosterText, type Roster } from "./domain/roster";
export type { RegisterGuestInput } from "./application/register-guest";
export {
  acceptsWaitlist,
  REJECTION_REASON_MAX_LENGTH,
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
  InvalidRejectionReasonError,
  NothingToReviewError,
  PaymentNotExpectedError,
  RegistrationNotFoundError,
} from "./domain/errors";
export {
  findRegistrationOverview,
  promoteWaitlisted,
  countConfirmedRegistrations,
  countConfirmedRegistrationsByEvent,
  listEventRegistrationIds,
} from "./infrastructure/prisma-registration-reader";
