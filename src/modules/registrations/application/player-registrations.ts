import { PhoneNumber } from "../domain/phone-number";
import type { PlayerRegistrations } from "./ports";

/** Once a Google player gives their phone, earlier guest sign-ups with it become theirs. */
export function makeLinkGuestRegistrations(deps: { registrations: PlayerRegistrations }) {
  return async function linkGuestRegistrations(input: { userId: string; phone: string }) {
    const phone = PhoneNumber.parse(input.phone).value;
    return deps.registrations.linkGuestsToUser(phone, input.userId);
  };
}

/** "Mis inscripciones": the player's registrations, newest first, cancelled ones left out. */
export function makeListPlayerRegistrations(deps: { registrations: PlayerRegistrations }) {
  return async function listPlayerRegistrations(userId: string) {
    const rows = await deps.registrations.listByUser(userId);
    return rows
      .filter((row) => row.status !== "cancelled")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };
}
