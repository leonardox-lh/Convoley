import type { CheckIns } from "./ports";

/**
 * HU-38: the organizer marks (or unmarks) a player as present, by QR or by hand. Only players
 * holding a seat can be marked; returns false otherwise.
 */
export function makeSetCheckIn(deps: { checkIns: CheckIns; now: () => Date }) {
  return function setCheckIn(input: { eventId: string; registrationId: string; present: boolean }) {
    return deps.checkIns.set(
      input.eventId,
      input.registrationId,
      input.present ? deps.now() : null,
    );
  };
}
