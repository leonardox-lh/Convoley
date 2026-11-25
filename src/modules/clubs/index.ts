import { db } from "@/lib/db";
import {
  makeCreateCommunity,
  makeDeleteCommunity,
  makeListCommunities,
  makeRenameCommunity,
} from "./application/communities";
import { makeCreateClub } from "./application/create-club";
import {
  makeAcceptInvitation,
  makeCreateInvitation,
  makeGetInvitation,
  makeListClubMembers,
  makeRemoveClubMember,
} from "./application/members";
import { prismaClubMemberRepository } from "./infrastructure/prisma-club-member-repository";
import { makeUpdatePaymentSettings } from "./application/update-payment-settings";
import { makeUpdateServiceFee } from "./application/update-service-fee";
import { makeUpdateCancellationPolicy } from "./application/update-cancellation-policy";
import { serviceFeeCents } from "./domain/service-fee";
import { uploadLogo } from "./application/upload-logo";
import { makeUpdateClubProfile } from "./application/update-club-profile";
import { prismaCommunityRepository } from "./infrastructure/prisma-community-repository";
import {
  findCancellationDeadlineHours,
  findServiceFee,
  prismaPaymentSettingsRepository,
} from "./infrastructure/prisma-payment-settings-repository";
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
  InvalidPaymentHolderError,
  InvalidPaymentPhoneError,
  InvalidServiceFeeError,
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
const paymentSettings = prismaPaymentSettingsRepository(db);
export const getPaymentSettings = (clubSlug: string) => paymentSettings.find(clubSlug);
export const updatePaymentSettings = makeUpdatePaymentSettings({
  settings: paymentSettings,
  images: logos,
});
export type { ClubPaymentSettings } from "./application/ports";
export const updateServiceFee = makeUpdateServiceFee({ settings: paymentSettings });
export {
  MAX_FIXED_SERVICE_FEE_CENTS,
  MAX_SERVICE_FEE_PERCENT_BPS,
  serviceFeeCents,
} from "./domain/service-fee";
/** HU-22: what a player pays on top of `priceCents` when paying this club by Mercado Pago. */
export const serviceFeeFor = async (clubId: string, priceCents: number) =>
  serviceFeeCents(priceCents, await findServiceFee(db, clubId));
export const readClubLogo = (key: string) => logos.read(key);
/** HU-23: public images of the club (product photos), stored and served like the logo. */
export const saveClubImage = (
  clubSlug: string,
  image: { bytes: Uint8Array; contentType: string },
) => uploadLogo(logos, clubSlug, image);

/** Public path that serves a stored logo (see src/app/logos/[key]/route.ts). */
export const clubLogoPath = (logoKey: string) => `/logos/${logoKey}`;

// HU-33: co-organizers.
export { can, type ClubPermission, type ClubRole } from "./domain/permissions";
export { INVITATION_TTL_DAYS } from "./domain/invitation";
export {
  ClubMemberNotFoundError,
  InvitationExpiredError,
  InvitationInvalidError,
  LastAdminError,
} from "./domain/errors";
export type { ClubMemberView } from "./application/ports";
const members = prismaClubMemberRepository(db);
const memberDeps = { members, now: () => new Date() };
export const createInvitation = makeCreateInvitation(memberDeps);
export const getInvitation = makeGetInvitation(memberDeps);
export const acceptInvitation = makeAcceptInvitation(memberDeps);
export const listClubMembers = makeListClubMembers(memberDeps);
export const removeClubMember = makeRemoveClubMember(memberDeps);

// HU-30: cancellation policy.
export const updateCancellationPolicy = makeUpdateCancellationPolicy({ settings: paymentSettings });
export const cancellationDeadlineHoursFor = (clubId: string) =>
  findCancellationDeadlineHours(db, clubId);
export { MAX_CANCELLATION_DEADLINE_HOURS } from "./domain/cancellation-policy";
export { InvalidCancellationPolicyError } from "./domain/errors";
