import type { RegistrationStatus } from "../domain/registration";
import type { RegistrationListReader } from "./ports";

export interface ListEventRegistrationsInput {
  eventId: string;
  /** Without a status, cancelled registrations are left out. */
  status?: RegistrationStatus;
}

/** The registrations of an event in sign-up order, optionally filtered by payment status. */
export function makeListEventRegistrations(deps: { registrations: RegistrationListReader }) {
  return async function listEventRegistrations(input: ListEventRegistrationsInput) {
    const rows = await deps.registrations.listByEvent(input.eventId);
    return rows
      .filter((row) => (input.status ? row.status === input.status : row.status !== "cancelled"))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  };
}
