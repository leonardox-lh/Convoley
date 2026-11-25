import { InvalidCommunityNameError } from "./errors";

export const COMMUNITY_NAME_MAX_LENGTH = 40;

/** Levels every new club starts with; the organizer can rename them or add more. */
export const DEFAULT_LEVELS = ["General", "Básico", "Intermedio", "Competitivo"] as const;

/**
 * The default levels as rows to create. Communities are listed by creation time, so each one is
 * a millisecond apart to keep this order instead of whatever the database returns for a tie.
 */
export function defaultLevelRows(now: Date): { name: string; createdAt: Date }[] {
  return DEFAULT_LEVELS.map((name, index) => ({
    name,
    createdAt: new Date(now.getTime() + index),
  }));
}

/** Name of a community or level, e.g. "General", "Amateur", "Competitivo". */
export function parseCommunityName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > COMMUNITY_NAME_MAX_LENGTH) throw new InvalidCommunityNameError(raw);
  return name;
}
