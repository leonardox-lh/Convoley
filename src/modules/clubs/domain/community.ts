import { InvalidCommunityNameError } from "./errors";

export const COMMUNITY_NAME_MAX_LENGTH = 40;

/** Name of a community or level, e.g. "General", "Amateur", "Competitivo". */
export function parseCommunityName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > COMMUNITY_NAME_MAX_LENGTH) throw new InvalidCommunityNameError(raw);
  return name;
}
