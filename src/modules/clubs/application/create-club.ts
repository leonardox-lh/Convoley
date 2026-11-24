import { validateClubProfile, type ClubProfileProps } from "../domain/club-profile";
import { ClubSlug } from "../domain/club-slug";
import { validateLogo, type LogoUpload } from "../domain/logo";
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
    // Reject a bad logo before creating anything.
    if (input.logo) validateLogo(input.logo);

    await deps.clubs.createWithAdmin({ slug, profile, adminUserId: input.adminUserId });
    if (input.logo) {
      const logoKey = await uploadLogo(deps.logos, slug, input.logo);
      await deps.clubs.updateProfile(slug, { logoKey });
    }
    return { slug };
  };
}
