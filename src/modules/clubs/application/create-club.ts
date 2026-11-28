import { validateClubProfile, type ClubProfileProps } from "../domain/club-profile";
import { ClubSlug } from "../domain/club-slug";
import { ClubAlreadyOwnedError } from "../domain/errors";
import type { LogoUpload } from "../domain/logo";
import type { ClubRepository, LogoStorage } from "./ports";
import { uploadLogo } from "./upload-logo";

export interface CreateClubInput {
  adminUserId: string;
  /** Wanted link; when empty the slug comes from the club name. */
  slug: string | null;
  profile: ClubProfileProps;
  logo: LogoUpload | null;
}

export function makeCreateClub(deps: { clubs: ClubRepository; logos: LogoStorage }) {
  return async function createClub(input: CreateClubInput): Promise<{ slug: string }> {
    const slug = ClubSlug.create(input.slug || input.profile.name).value;
    const profile = validateClubProfile(input.profile);
    // Checked before the logo upload; the repository enforces it again for simultaneous requests.
    if (await deps.clubs.ownsClub(input.adminUserId)) {
      throw new ClubAlreadyOwnedError(input.adminUserId);
    }
    // Logo first: if the bucket fails, no club is left behind holding the slug.
    // shortcut: if the slug turns out taken, the uploaded logo stays orphaned in the bucket.
    const logoKey = input.logo ? await uploadLogo(deps.logos, slug, input.logo) : null;
    await deps.clubs.createWithAdmin({ slug, profile, logoKey, adminUserId: input.adminUserId });
    return { slug };
  };
}
