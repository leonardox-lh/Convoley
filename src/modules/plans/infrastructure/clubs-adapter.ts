import { listCommunities, serviceFeeFor } from "@/modules/clubs";
import type { ClubCommunities, ServiceFees } from "../application/ports";

export const clubCommunitiesAdapter: ClubCommunities = {
  idsOf: async (clubSlug) => (await listCommunities(clubSlug)).map((community) => community.id),
};
export const serviceFeesAdapter: ServiceFees = { forCharge: serviceFeeFor };
