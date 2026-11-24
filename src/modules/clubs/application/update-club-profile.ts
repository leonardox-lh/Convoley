import { validateClubProfile, type ClubProfileProps } from "../domain/club-profile";
import { ClubNotFoundError } from "../domain/errors";
import type { LogoUpload } from "../domain/logo";
import type { ClubRepository, LogoStorage } from "./ports";
import { uploadLogo } from "./upload-logo";

export interface UpdateClubProfileInput {
  clubSlug: string;
  profile: ClubProfileProps;
  /** A new logo, or null to keep the current one. */
  logo: LogoUpload | null;
}

export function makeUpdateClubProfile(deps: { clubs: ClubRepository; logos: LogoStorage }) {
  return async function updateClubProfile(input: UpdateClubProfileInput): Promise<void> {
    const profile = validateClubProfile(input.profile);
    if (!(await deps.clubs.findProfile(input.clubSlug))) {
      throw new ClubNotFoundError(input.clubSlug);
    }
    // shortcut: the replaced logo stays in the bucket; delete it if storage costs ever matter.
    const logoKey = input.logo
      ? await uploadLogo(deps.logos, input.clubSlug, input.logo)
      : undefined;
    await deps.clubs.updateProfile(input.clubSlug, { ...profile, ...(logoKey && { logoKey }) });
  };
}
