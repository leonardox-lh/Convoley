import { listCommunities } from "@/modules/clubs";
import type { ClubCommunities } from "../application/ports";

export const clubCommunitiesAdapter: ClubCommunities = {
  idsOf: async (clubSlug) => (await listCommunities(clubSlug)).map((community) => community.id),
};
