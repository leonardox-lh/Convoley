import { PlayerDetailsLockedError, RegistrationNotFoundError } from "../domain/errors";
import { canEditPlayerDetails, holdsSeat } from "../domain/registration";
import type {
  EventSeats,
  PlayerDetails,
  RegistrationListReader,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";

export type EditablePlayerDetails = Required<Pick<PlayerDetails, "position" | "level" | "gender">>;

type Deps = {
  events: EventSeats;
  registrations: RegistrationRepository;
  list: RegistrationListReader;
  transactions: TransactionRunner;
  now: () => Date;
};

async function evaluate(deps: Deps, registrationId: string, tx: TransactionContext) {
  const registration = await deps.registrations.findById(registrationId, tx);
  const event = registration && (await deps.events.lock(registration.eventId, tx));
  if (!registration || !event) throw new RegistrationNotFoundError(registrationId);
  const rows = await deps.list.listByEvent(event.id);
  const editable = canEditPlayerDetails({
    status: registration.status,
    event,
    teamsBuilt: rows.some((row) => row.teamNumber !== null && holdsSeat(row.status)),
    now: deps.now(),
  });
  const own = rows.find((row) => row.id === registration.id);
  return editable && own ? { position: own.position, level: own.level, gender: own.gender } : null;
}

/** The player's current details, or null once they can't change them anymore. */
export function makeGetEditableOwnDetails(deps: Deps) {
  return (registrationId: string): Promise<EditablePlayerDetails | null> =>
    deps.transactions.run((tx) => evaluate(deps, registrationId, tx));
}

/** From their private link, the player fixes or adds their position, level and gender. */
export function makeEditOwnDetails(deps: Deps) {
  return (input: {
    registrationId: string;
    /** Without `gender` (not a mixed event) it stays as it was. */
    details: Pick<PlayerDetails, "position" | "level" | "gender">;
  }) =>
    deps.transactions.run(async (tx) => {
      if (!(await evaluate(deps, input.registrationId, tx)))
        throw new PlayerDetailsLockedError(input.registrationId);
      await deps.registrations.updateDetails(input.registrationId, input.details, tx);
    });
}
