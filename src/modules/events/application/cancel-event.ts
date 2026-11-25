import { assertCancellable, type CancellationOutcome } from "../domain/event";
import { EventNotFoundError } from "../domain/errors";
import type {
  ClubReader,
  CreditsReturner,
  EventRepository,
  PaymentsMarker,
  RegistrationsReader,
  TransactionRunner,
} from "./ports";
import { requireClub } from "./require-club";

export type CancelEventInput = { clubSlug: string; eventId: string; outcome: CancellationOutcome };

export function makeCancelEvent(deps: {
  clubs: ClubReader;
  events: EventRepository;
  registrations: RegistrationsReader;
  payments: PaymentsMarker;
  credits: CreditsReturner;
  transactions: TransactionRunner;
  now: () => Date;
}) {
  return async function cancelEvent(input: CancelEventInput) {
    const club = await requireClub(deps.clubs, input.clubSlug);

    // One transaction: the event is never cancelled with its payments left unmarked.
    await deps.transactions.run(async (tx) => {
      const current = await deps.events.lockInClub(club.id, input.eventId, tx);
      if (!current) throw new EventNotFoundError(input.eventId);
      assertCancellable(current.status);

      const registrationIds = await deps.registrations.listIds(input.eventId, tx);
      await deps.payments.markForCancellation({ registrationIds, outcome: input.outcome }, tx);
      await deps.credits.giveBack(registrationIds, tx);
      await deps.events.markCancelled(
        input.eventId,
        { at: deps.now(), outcome: input.outcome },
        tx,
      );
    });
  };
}
