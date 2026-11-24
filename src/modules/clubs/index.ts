import { db } from "@/lib/db";
import {
  makeCreateCommunity,
  makeDeleteCommunity,
  makeListCommunities,
  makeRenameCommunity,
} from "./application/communities";
import { makeCreateClub } from "./application/create-club";
import { makeUpdateClubProfile } from "./application/update-club-profile";
import { prismaCommunityRepository } from "./infrastructure/prisma-community-repository";
import { prismaClubRepository } from "./infrastructure/prisma-club-repository";
import { s3LogoStorage } from "./infrastructure/s3-logo-storage";

export { ClubSlug } from "./domain/club-slug";
export {
  ClubNotFoundError,
  ClubSlugTakenError,
  CommunityInUseError,
  CommunityNameTakenError,
  CommunityNotFoundError,
  InvalidCommunityNameError,
  LastCommunityError,
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
  findClubNamesByIds,
  findFirstClubSlugForMember,
} from "./infrastructure/prisma-club-reader";

const clubs = prismaClubRepository(db);
const logos = s3LogoStorage();

export const createClub = makeCreateClub({ clubs, logos });
export const updateClubProfile = makeUpdateClubProfile({ clubs, logos });
export const getClubProfile = (slug: string) => clubs.findProfile(slug);
const communities = prismaCommunityRepository(db);
export const listCommunities = makeListCommunities({ communities });
export const createCommunity = makeCreateCommunity({ communities });
export const renameCommunity = makeRenameCommunity({ communities });
export const deleteCommunity = makeDeleteCommunity({ communities });
export { COMMUNITY_NAME_MAX_LENGTH } from "./domain/community";
export const readClubLogo = (key: string) => logos.read(key);

/** Public path that serves a stored logo (see src/app/logos/[key]/route.ts). */
export const clubLogoPath = (logoKey: string) => `/logos/${logoKey}`;
