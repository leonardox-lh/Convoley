export class InvalidClubSlugError extends Error {
  constructor(readonly raw: string) {
    super(`Invalid club slug: "${raw}"`);
    this.name = "InvalidClubSlugError";
  }
}
