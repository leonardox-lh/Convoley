import { serviceFeeFor } from "@/modules/clubs";
import type { ServiceFees } from "../application/ports";

export const serviceFeesAdapter: ServiceFees = { forCharge: serviceFeeFor };
