import type { ClubProfileProps } from "../domain/club-profile";
import type { LogoContentType } from "../domain/logo";

export interface ClubProfile extends ClubProfileProps {
  slug: string;
  logoKey: string | null;
}

export interface ClubRepository {
  /** Creates the club with the user as admin and a "General" community. Throws ClubSlugTakenError. */
  createWithAdmin(input: {
    slug: string;
    profile: ClubProfileProps;
    logoKey: string | null;
    adminUserId: string;
  }): Promise<void>;
  findProfile(slug: string): Promise<ClubProfile | null>;
  updateProfile(
    slug: string,
    changes: Partial<ClubProfileProps & { logoKey: string }>,
  ): Promise<void>;
}

/** Public files: logos are shown to anyone, unlike payment vouchers. */
export interface LogoStorage {
  save(logo: { key: string; bytes: Uint8Array; contentType: LogoContentType }): Promise<void>;
  /** The stored logo, or null if there is none with that key. */
  read(key: string): Promise<{ body: ReadableStream; contentType: LogoContentType } | null>;
}

export interface Community {
  id: string;
  name: string;
}

export interface CommunityRepository {
  findClubId(clubSlug: string): Promise<string | null>;
  /** Oldest first, so "General" (created with the club) leads. */
  list(clubId: string): Promise<Community[]>;
  /** Throws CommunityNameTakenError if the club already has that name. */
  create(clubId: string, name: string): Promise<void>;
  /** Throws CommunityNameTakenError if the club already has that name. */
  rename(id: string, name: string): Promise<void>;
  /** Throws CommunityInUseError if events belong to it. */
  delete(id: string): Promise<void>;
}
