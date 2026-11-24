import { holdsSeat, type RegistrationStatus } from "./registration";

export interface RosterSource {
  firstName: string;
  lastName: string;
  status: RegistrationStatus;
  createdAt: Date;
}

export interface Roster {
  /** Players with a seat, numbered from 1 in sign-up order. */
  players: { number: number; name: string; paid: boolean }[];
  /** The waitlist, numbered from 1 in arrival order. */
  waitlist: { number: number; name: string }[];
}

/**
 * The list the organizer shares in the group (HU-16 image, HU-17 text): who is in, in order,
 * who already paid, and who is waiting. Cancelled sign-ups are left out.
 */
export function buildRoster(registrations: RosterSource[]): Roster {
  const ordered = [...registrations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const name = (r: RosterSource) => `${r.firstName} ${r.lastName}`.trim();
  return {
    players: ordered
      .filter((r) => holdsSeat(r.status))
      .map((r, index) => ({ number: index + 1, name: name(r), paid: r.status === "paid" })),
    waitlist: ordered
      .filter((r) => r.status === "waitlisted")
      .map((r, index) => ({ number: index + 1, name: name(r) })),
  };
}

/** WhatsApp-ready text (HU-17): "1. Juan Pérez ✅", then the waitlist. */
export function rosterText(input: { title: string; when: string; roster: Roster }): string {
  const lines = [`*${input.title}*`, input.when, ""];
  lines.push(...input.roster.players.map((p) => `${p.number}. ${p.name}${p.paid ? " ✅" : ""}`));
  if (input.roster.waitlist.length > 0) {
    lines.push("", "*Lista de espera*");
    lines.push(...input.roster.waitlist.map((p) => `${p.number}. ${p.name}`));
  }
  return lines.join("\n");
}
