import {
  holdsSeat,
  type PlayerLevel,
  type PlayerPosition,
  type RegistrationStatus,
} from "./registration";

export interface RosterSource {
  firstName: string;
  lastName: string;
  status: RegistrationStatus;
  createdAt: Date;
  /** Asked only in mixed events. */
  gender?: string | null;
  position?: PlayerPosition | null;
  level?: PlayerLevel | null;
}

/** What other players may see about someone on the list: never their phone. */
interface RosterPlayer {
  number: number;
  name: string;
  gender: string | null;
  position: PlayerPosition | null;
  level: PlayerLevel | null;
}

export interface Roster {
  /** Players with a seat, numbered from 1 in sign-up order. */
  players: (RosterPlayer & { paid: boolean })[];
  /** The waitlist, numbered from 1 in arrival order. */
  waitlist: RosterPlayer[];
}

/**
 * The list the organizer shares in the group (HU-16 image, HU-17 text): who is in, in order,
 * who already paid, and who is waiting. Cancelled sign-ups are left out.
 */
export function buildRoster(registrations: RosterSource[]): Roster {
  const ordered = [...registrations].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const player = (r: RosterSource, index: number): RosterPlayer => ({
    number: index + 1,
    name: `${r.firstName} ${r.lastName}`.trim(),
    gender: r.gender ?? null,
    position: r.position ?? null,
    level: r.level ?? null,
  });
  return {
    players: ordered
      .filter((r) => holdsSeat(r.status))
      .map((r, index) => ({ ...player(r, index), paid: r.status === "paid" })),
    waitlist: ordered.filter((r) => r.status === "waitlisted").map(player),
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
