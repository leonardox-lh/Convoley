import { InvitationExpiredError, InvitationInvalidError } from "./errors";

export const INVITATION_TTL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const invitationExpiresAt = (now: Date) =>
  new Date(now.getTime() + INVITATION_TTL_DAYS * MS_PER_DAY);

/** A link works once and only until it expires. */
export function assertInvitationUsable(
  invitation: { expiresAt: Date; usedAt: Date | null } | null,
  now: Date,
): void {
  if (!invitation || invitation.usedAt) throw new InvitationInvalidError();
  if (invitation.expiresAt <= now) throw new InvitationExpiredError();
}
