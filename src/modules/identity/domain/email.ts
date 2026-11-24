/** One account per address regardless of case or stray spaces. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
