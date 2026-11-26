import type { PlayerGender } from "../domain/registration";
import { recordPaid } from "./mark-paid-manually";
import type {
  EventSeats,
  ManualPayments,
  RegistrationRepository,
  TransactionRunner,
} from "./ports";
import { registerPlayer } from "./register-guest";

export interface AddPlayerManuallyInput {
  eventId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  /** HU-31: asked only in mixed events. */
  gender?: PlayerGender | null;
  /** The player already paid the organizer outside Convoley (cash, transfer). */
  markPaid: boolean;
  organizerUserId: string;
}

/** The organizer signs a player up with the same rules as a guest, optionally already paid. */
export function makeAddPlayerManually(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  payments: ManualPayments;
  transactions: TransactionRunner;
  now: () => Date;
}) {
  return async function addPlayerManually(input: AddPlayerManuallyInput) {
    return deps.transactions.run(async (tx) => {
      const { id, event } = await registerPlayer(
        deps,
        { ...input, userId: null, allowWaitlist: false },
        tx,
      );
      if (!input.markPaid) return { id, status: "pending_payment" as const };

      await recordPaid(
        deps,
        { event, registrationId: id, reviewedByUserId: input.organizerUserId },
        tx,
      );
      return { id, status: "paid" as const };
    });
  };
}
