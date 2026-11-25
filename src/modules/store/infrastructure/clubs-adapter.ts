import { saveClubImage, serviceFeeFor } from "@/modules/clubs";
import type { ProductImages, ServiceFees } from "../application/ports";

export const productImagesAdapter: ProductImages = { save: saveClubImage };
export const serviceFeesAdapter: ServiceFees = { forCharge: serviceFeeFor };
