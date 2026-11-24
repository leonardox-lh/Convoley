// "3.5" or "3,5" → 350 basis points; at most 2 decimals.
const PERCENT_FORMAT = /^(\d{1,2})(?:[.,](\d{1,2}))?$/;
const BASIS_POINTS_PER_PERCENT = 100;

/** A percentage typed by the organizer (HU-22), as integer basis points; null if malformed. */
export function percentToBasisPoints(raw: string): number | null {
  const match = PERCENT_FORMAT.exec(raw.trim());
  if (!match) return null;
  const [, whole, decimals = ""] = match;
  return Number(whole) * BASIS_POINTS_PER_PERCENT + Number(decimals.padEnd(2, "0"));
}

/** Basis points back to the text the form shows: 350 → "3.5". */
export function basisPointsToPercentText(bps: number): string {
  return String(bps / BASIS_POINTS_PER_PERCENT);
}
