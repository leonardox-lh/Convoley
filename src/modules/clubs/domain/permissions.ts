export type ClubRole = "admin" | "helper";

/**
 * HU-33: `run_game_day` is what a helper does at the court (registrations, approving
 * payments, deliveries, teams, check-in); `manage_club` is everything else, finances included.
 */
export type ClubPermission = "manage_club" | "run_game_day";

export function can(role: ClubRole, permission: ClubPermission): boolean {
  return role === "admin" || permission === "run_game_day";
}
