import { InvalidClubSlugError } from "./errors";

const MIN_LENGTH = 3;
const MAX_LENGTH = 40;
const SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** URL identifier of a club, e.g. "voley-miraflores" in /c/voley-miraflores. */
export class ClubSlug {
  private constructor(readonly value: string) {}

  static create(raw: string): ClubSlug {
    const slug = raw
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (slug.length < MIN_LENGTH || slug.length > MAX_LENGTH || !SLUG_FORMAT.test(slug)) {
      throw new InvalidClubSlugError(raw);
    }
    return new ClubSlug(slug);
  }
}
