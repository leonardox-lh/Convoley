import { saveClubImage } from "@/modules/clubs";
import type { ProductImages } from "../application/ports";

export const productImagesAdapter: ProductImages = { save: saveClubImage };
