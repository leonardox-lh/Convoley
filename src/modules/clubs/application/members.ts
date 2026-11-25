import { createHash, randomBytes } from "node:crypto";
import { assertInvitationUsable, invitationExpiresAt } from "../domain/invitation";
import {
  ClubMemberNotFoundError,
  ClubNotFoundError,
  InvitationInvalidError,
  LastAdminError,
} from "../domain/errors";
import type { ClubRole } from "../domain/permissions";
import type { ClubMemberRepository } from "./ports";

type Deps = { members: ClubMemberRepository; now: () => Date };

const TOKEN_BYTES = 32;
/** Only the hash is stored, so a database leak can't be turned into working links. */
export const hashInvitationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function requireClubId(deps: Pick<Deps, "members">, clubSlug: string) {
  const clubId = await deps.members.findClubId(clubSlug);
  if (!clubId) throw new ClubNotFoundError(clubSlug);
  return clubId;
}

/** HU-33: returns the raw token for the link; it can't be recovered later. */
export function makeCreateInvitation(deps: Deps) {
  return async function createInvitation(input: {
    clubSlug: string;
    role: ClubRole;
    createdByUserId: string;
  }): Promise<string> {
    const clubId = await requireClubId(deps, input.clubSlug);
    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    await deps.members.createInvitation({
      clubId,
      role: input.role,
      tokenHash: hashInvitationToken(token),
      expiresAt: invitationExpiresAt(deps.now()),
      createdByUserId: input.createdByUserId,
    });
    return token;
  };
}

/** What the invitation page shows before accepting. Throws if it can't be used. */
export function makeGetInvitation(deps: Deps) {
  return async function getInvitation(token: string) {
    const invitation = await deps.members.findInvitation(hashInvitationToken(token));
    assertInvitationUsable(invitation, deps.now());
    const { clubSlug, clubName, role } = invitation!;
    return { clubSlug, clubName, role };
  };
}

export function makeAcceptInvitation(deps: Deps) {
  return async function acceptInvitation(input: { token: string; userId: string }) {
    const invitation = await deps.members.findInvitation(hashInvitationToken(input.token));
    const now = deps.now();
    assertInvitationUsable(invitation, now);
    const accepted = await deps.members.acceptInvitation({
      invitationId: invitation!.id,
      userId: input.userId,
      now,
    });
    if (!accepted) throw new InvitationInvalidError();
    return { clubSlug: invitation!.clubSlug };
  };
}

export function makeListClubMembers(deps: Pick<Deps, "members">) {
  return async function listClubMembers(clubSlug: string) {
    return deps.members.listMembers(await requireClubId(deps, clubSlug));
  };
}

export function makeRemoveClubMember(deps: Pick<Deps, "members">) {
  return async function removeClubMember(input: { clubSlug: string; userId: string }) {
    const clubId = await requireClubId(deps, input.clubSlug);
    const members = await deps.members.listMembers(clubId);
    const target = members.find((member) => member.userId === input.userId);
    if (!target) throw new ClubMemberNotFoundError(input.userId);
    const admins = members.filter((member) => member.role === "admin");
    // shortcut: two admins removing each other at the same instant could both pass; lock the
    // club's members if co-organizers ever get that busy.
    if (target.role === "admin" && admins.length === 1) throw new LastAdminError();
    await deps.members.removeMember(clubId, input.userId);
  };
}
