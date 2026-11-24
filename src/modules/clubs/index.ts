import { db } from "@/lib/db";
import { makeCreateClub } from "./application/create-club";
import { makeUpdateClubProfile } from "./application/update-club-profile";
import { prismaClubRepository } from "./infrastructure/prisma-club-repository";
import { s3LogoStorage } from "./infrastructure/s3-logo-storage";

export { ClubSlug } from "./domain/club-slug";
export {
  ClubNotFoundError,
  ClubSlugTakenError,
  InvalidClubSlugError,
  InvalidColorError,
  InvalidLogoTypeError,
  InvalidSocialLinkError,
  LogoTooLargeError,
  ReservedClubSlugError,
} from "./domain/errors";
export { MAX_LOGO_BYTES } from "./domain/logo";
export type { ClubProfile } from "./application/ports";
export {
  findClubBySlug,
  findClubMembership,
  findFirstClubSlugForMember,
} from "./infrastructure/prisma-club-reader";

const clubs = prismaClubRepository(db);
const logos = s3LogoStorage();

export const createClub = makeCreateClub({ clubs, logos });
export const updateClubProfile = makeUpdateClubProfile({ clubs, logos });
export const getClubProfile = (slug: string) => clubs.findProfile(slug);
export const readClubLogo = (key: string) => logos.read(key);

/** Public path that serves a stored logo (see src/app/logos/[key]/route.ts). */
export const clubLogoPath = (logoKey: string) => `/logos/${logoKey}`;
