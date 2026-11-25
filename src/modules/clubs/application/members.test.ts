import { describe, expect, it } from "vitest";
import { InvitationExpiredError, InvitationInvalidError, LastAdminError } from "../domain/errors";
import type { ClubRole } from "../domain/permissions";
import {
  hashInvitationToken,
  makeAcceptInvitation,
  makeCreateInvitation,
  makeGetInvitation,
  makeListClubMembers,
  makeRemoveClubMember,
} from "./members";
import type { ClubMemberRepository, PendingInvitation } from "./ports";

const DAY_MS = 24 * 60 * 60 * 1000;

/** In-memory members and invitations with the database's single-use rule. */
function fakeMembers(initial: { userId: string; role: ClubRole }[]) {
  const members = initial.map((member) => ({ ...member, name: member.userId, email: null }));
  const invitations: (PendingInvitation & { tokenHash: string })[] = [];
  const repository: ClubMemberRepository = {
    findClubId: async (slug) => (slug === "club-1" ? "club-1" : null),
    async createInvitation(input) {
      invitations.push({
        id: `inv-${invitations.length + 1}`,
        clubSlug: "club-1",
        clubName: "Vóley Miraflores",
        usedAt: null,
        ...input,
      });
    },
    findInvitation: async (hash) => invitations.find((row) => row.tokenHash === hash) ?? null,
    async acceptInvitation({ invitationId, userId, now }) {
      const invitation = invitations.find((row) => row.id === invitationId)!;
      if (invitation.usedAt) return false;
      invitation.usedAt = now;
      if (!members.some((member) => member.userId === userId)) {
        members.push({ userId, role: invitation.role, name: userId, email: null });
      }
      return true;
    },
    listMembers: async () => members.map((member) => ({ ...member })),
    async removeMember(_clubId, userId) {
      members.splice(
        members.findIndex((member) => member.userId === userId),
        1,
      );
    },
  };
  return { repository, members, invitations };
}

function setup(initial = [{ userId: "owner", role: "admin" as ClubRole }]) {
  const fake = fakeMembers(initial);
  let now = new Date("2026-12-01T12:00:00Z");
  const deps = { members: fake.repository, now: () => now };
  return {
    ...fake,
    setNow: (date: Date) => (now = date),
    create: makeCreateInvitation(deps),
    get: makeGetInvitation(deps),
    accept: makeAcceptInvitation(deps),
    list: makeListClubMembers(deps),
    remove: makeRemoveClubMember(deps),
  };
}

describe("HU-33 criterio 1: roles administrador y ayudante", () => {
  it("HU-33: el invitado entra al club con el rol elegido", async () => {
    const club = setup();
    const token = await club.create({
      clubSlug: "club-1",
      role: "helper",
      createdByUserId: "owner",
    });
    const result = await club.accept({ token, userId: "ana" });
    expect(result).toEqual({ clubSlug: "club-1" });
    expect(await club.list("club-1")).toContainEqual(
      expect.objectContaining({ userId: "ana", role: "helper" }),
    );
  });

  it("HU-33: guarda solo el hash del token, no el token", async () => {
    const club = setup();
    const token = await club.create({
      clubSlug: "club-1",
      role: "admin",
      createdByUserId: "owner",
    });
    expect(club.invitations[0].tokenHash).toBe(hashInvitationToken(token));
    expect(club.invitations[0].tokenHash).not.toBe(token);
  });

  it("HU-33: el link sirve una sola vez", async () => {
    const club = setup();
    const token = await club.create({
      clubSlug: "club-1",
      role: "helper",
      createdByUserId: "owner",
    });
    await club.accept({ token, userId: "ana" });
    await expect(club.accept({ token, userId: "luis" })).rejects.toThrow(InvitationInvalidError);
  });

  it("HU-33: el link vence a los 7 días", async () => {
    const club = setup();
    const token = await club.create({
      clubSlug: "club-1",
      role: "helper",
      createdByUserId: "owner",
    });
    club.setNow(new Date(new Date("2026-12-01T12:00:00Z").getTime() + 7 * DAY_MS));
    await expect(club.get(token)).rejects.toThrow(InvitationExpiredError);
    await expect(club.accept({ token, userId: "ana" })).rejects.toThrow(InvitationExpiredError);
  });

  it("HU-33: un token inventado no sirve", async () => {
    const club = setup();
    await expect(club.get("inventado")).rejects.toThrow(InvitationInvalidError);
  });

  it("HU-33: un miembro que acepta otra invitación conserva su rol", async () => {
    const club = setup([
      { userId: "owner", role: "admin" },
      { userId: "ana", role: "admin" },
    ]);
    const token = await club.create({
      clubSlug: "club-1",
      role: "helper",
      createdByUserId: "owner",
    });
    await club.accept({ token, userId: "ana" });
    expect(club.members.find((member) => member.userId === "ana")?.role).toBe("admin");
  });

  it("HU-33: se puede quitar a un ayudante", async () => {
    const club = setup([
      { userId: "owner", role: "admin" },
      { userId: "ana", role: "helper" },
    ]);
    await club.remove({ clubSlug: "club-1", userId: "ana" });
    expect(club.members.map((member) => member.userId)).toEqual(["owner"]);
  });

  it("HU-33: no se puede quitar al último administrador", async () => {
    const club = setup([
      { userId: "owner", role: "admin" },
      { userId: "ana", role: "helper" },
    ]);
    await expect(club.remove({ clubSlug: "club-1", userId: "owner" })).rejects.toThrow(
      LastAdminError,
    );
  });
});
