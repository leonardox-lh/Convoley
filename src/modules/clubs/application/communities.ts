import { parseCommunityName } from "../domain/community";
import { ClubNotFoundError, CommunityNotFoundError, LastCommunityError } from "../domain/errors";
import type { CommunityRepository } from "./ports";

type Deps = { communities: CommunityRepository };

async function requireClubId(deps: Deps, clubSlug: string) {
  const clubId = await deps.communities.findClubId(clubSlug);
  if (!clubId) throw new ClubNotFoundError(clubSlug);
  return clubId;
}

/** Only ids of this club's communities are accepted, so a form can't touch another club. */
async function requireCommunity(deps: Deps, clubSlug: string, communityId: string) {
  const all = await deps.communities.list(await requireClubId(deps, clubSlug));
  if (!all.some((community) => community.id === communityId)) {
    throw new CommunityNotFoundError(communityId);
  }
  return all;
}

export function makeListCommunities(deps: Deps) {
  return async function listCommunities(clubSlug: string) {
    return deps.communities.list(await requireClubId(deps, clubSlug));
  };
}

export function makeCreateCommunity(deps: Deps) {
  return async function createCommunity(input: { clubSlug: string; name: string }) {
    const name = parseCommunityName(input.name);
    await deps.communities.create(await requireClubId(deps, input.clubSlug), name);
  };
}

export function makeRenameCommunity(deps: Deps) {
  return async function renameCommunity(input: {
    clubSlug: string;
    communityId: string;
    name: string;
  }) {
    const name = parseCommunityName(input.name);
    await requireCommunity(deps, input.clubSlug, input.communityId);
    await deps.communities.rename(input.communityId, name);
  };
}

export function makeDeleteCommunity(deps: Deps) {
  return async function deleteCommunity(input: { clubSlug: string; communityId: string }) {
    const all = await requireCommunity(deps, input.clubSlug, input.communityId);
    if (all.length === 1) throw new LastCommunityError();
    await deps.communities.delete(input.communityId);
  };
}
