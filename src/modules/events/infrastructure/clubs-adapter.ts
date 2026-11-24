import { findClubBySlug } from "@/modules/clubs";
import type { ClubReader } from "../application/ports";

export const clubsAdapter: ClubReader = { findBySlug: findClubBySlug };
