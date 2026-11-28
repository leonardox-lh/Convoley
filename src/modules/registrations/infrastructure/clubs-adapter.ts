import { cancellationDeadlineHoursFor, saveClubImage, serviceFeeFor } from "@/modules/clubs";
import type { CancellationPolicies, ChampionPhotos, ServiceFees } from "../application/ports";

export const championPhotosAdapter: ChampionPhotos = { save: saveClubImage };

export const serviceFeesAdapter: ServiceFees = { forCharge: serviceFeeFor };

export const cancellationPoliciesAdapter: CancellationPolicies = {
  deadlineHours: cancellationDeadlineHoursFor,
};
