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
  read(key: string): Promise<{ body: ReadableStream; contentType: string } | null>;
}
