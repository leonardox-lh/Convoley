import type { PlayerProfileRepository } from "./ports";

/**
 * Stores the phone the first time a Google player signs up for an event. The phone of an
 * account never changes afterwards: it is what links the guest registrations to it.
 */
export function makeSavePlayerPhone(deps: { profiles: PlayerProfileRepository }) {
  return async function savePlayerPhone(input: { userId: string; phone: string }) {
    const profile = await deps.profiles.find(input.userId);
    if (!profile || profile.phone) return;
    await deps.profiles.setPhone(input.userId, input.phone);
  };
}
