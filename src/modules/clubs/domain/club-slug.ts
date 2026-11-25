import { InvalidClubSlugError, ReservedClubSlugError } from "./errors";

const MIN_LENGTH = 3;
const MAX_LENGTH = 40;
const SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Clubs live at the root (convoley.pe/<slug>), so a slug can't take the name of one of our own
 * routes, current or planned.
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "ayuda",
  "c",
  "club",
  "clubes",
  "convoley",
  "ingresar",
  "inscripcion",
  "invitacion",
  "logos",
  "mis-inscripciones",
  "pedido",
  "plan",
  "planes",
  "privacidad",
  "recuperar",
  "registro",
  "salir",
  "terminos",
  "tienda",
  "vouchers",
  "www",
]);

/** URL identifier of a club, e.g. "voley-miraflores" in convoley.pe/voley-miraflores. */
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
    if (RESERVED_SLUGS.has(slug)) throw new ReservedClubSlugError(slug);
    return new ClubSlug(slug);
  }
}
