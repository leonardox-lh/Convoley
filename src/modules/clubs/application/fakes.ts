import { ClubSlugTakenError, CommunityInUseError, CommunityNameTakenError } from "../domain/errors";
import type { ClubProfileProps } from "../domain/club-profile";
import type { LogoContentType } from "../domain/logo";
import type { ClubProfile, ClubRepository, CommunityRepository, LogoStorage } from "./ports";

export const profileProps = (overrides: Partial<ClubProfileProps> = {}): ClubProfileProps => ({
  name: "Vóley Miraflores",
  description: null,
  primaryColor: null,
  secondaryColor: null,
  instagramUrl: null,
  tiktokUrl: null,
  ...overrides,
});

/** In-memory club repository that behaves like the database (unique slug). */
export function fakeClubRepository(existing: ClubProfile[] = []) {
  const clubs = new Map(existing.map((club) => [club.slug, { ...club }]));
  const admins = new Map<string, string>();
  const repository: ClubRepository = {
    async createWithAdmin({ slug, profile, logoKey, adminUserId }) {
      if (clubs.has(slug)) throw new ClubSlugTakenError(slug);
      clubs.set(slug, { slug, logoKey, ...profile });
      admins.set(slug, adminUserId);
    },
    async findProfile(slug) {
      return clubs.get(slug) ?? null;
    },
    async updateProfile(slug, changes) {
      const club = clubs.get(slug);
      if (club) clubs.set(slug, { ...club, ...changes });
    },
  };
  return { repository, clubs, admins };
}

export function fakeLogoStorage() {
  const saved = new Map<string, { bytes: Uint8Array; contentType: LogoContentType }>();
  const storage: LogoStorage = {
    async save({ key, bytes, contentType }) {
      saved.set(key, { bytes, contentType });
    },
    async read(key) {
      const logo = saved.get(key);
      if (!logo) return null;
      return {
        body: new Blob([new Uint8Array(logo.bytes)]).stream(),
        contentType: logo.contentType,
      };
    },
  };
  return { storage, saved };
}

/** In-memory communities with the database rules: unique name per club, events block delete. */
export function fakeCommunityRepository(
  initial: { id: string; clubId: string; name: string }[],
  inUse: string[] = [],
) {
  const rows = [...initial];
  const repository: CommunityRepository = {
    findClubId: async (slug) => (slug === "club-1" ? "club-1" : null),
    list: async (clubId) =>
      rows.filter((row) => row.clubId === clubId).map(({ id, name }) => ({ id, name })),
    async create(clubId, name) {
      if (rows.some((row) => row.clubId === clubId && row.name === name)) {
        throw new CommunityNameTakenError(name);
      }
      rows.push({ id: `com-${rows.length + 1}`, clubId, name });
    },
    async rename(id, name) {
      const row = rows.find((candidate) => candidate.id === id)!;
      if (rows.some((other) => other.clubId === row.clubId && other.name === name)) {
        throw new CommunityNameTakenError(name);
      }
      row.name = name;
    },
    async delete(id) {
      if (inUse.includes(id)) throw new CommunityInUseError(id);
      rows.splice(
        rows.findIndex((row) => row.id === id),
        1,
      );
    },
  };
  return { repository, rows };
}
