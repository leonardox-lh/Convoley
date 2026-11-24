import { ClubNotFoundError, CommunityNotInClubError } from "../domain/errors";
import type { ClubReader, ClubSummary } from "./ports";

export async function requireClub(clubs: ClubReader, clubSlug: string): Promise<ClubSummary> {
  const club = await clubs.findBySlug(clubSlug);
  if (!club) throw new ClubNotFoundError(clubSlug);
  return club;
}

export function assertCommunityInClub(club: ClubSummary, communityId: string): void {
  if (!club.communities.some((community) => community.id === communityId)) {
    throw new CommunityNotInClubError(communityId);
  }
}
