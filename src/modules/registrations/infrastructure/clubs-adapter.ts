import { cancellationDeadlineHoursFor, serviceFeeFor } from "@/modules/clubs";
import type { CancellationPolicies, ServiceFees } from "../application/ports";

export const serviceFeesAdapter: ServiceFees = { forCharge: serviceFeeFor };

export const cancellationPoliciesAdapter: CancellationPolicies = {
  deadlineHours: cancellationDeadlineHoursFor,
};
