import { describe, expect, it, vi } from "vitest";

// The loader reads the database; only the pure text helpers are under test here.
vi.mock("@/modules/events", () => ({ getPublicEvent: vi.fn() }));
vi.mock("@/modules/registrations", () => ({
  countConfirmedRegistrations: vi.fn(),
  seatSummary: vi.fn(),
}));

const { seatsText, shareDescription } = await import("./event-preview");

const event = {
  startsAt: new Date("2026-12-06T01:00:00Z"),
  venueName: "Coliseo Miraflores",
  priceCents: 1500,
  status: "published" as const,
  freeSeats: 6,
};

describe("HU-11 criterio 2: descripción dinámica del link", () => {
  it("HU-11: incluye fecha en Lima, lugar, precio y cupos libres", () => {
    const text = shareDescription(event);
    expect(text).toMatch(/^Sábado, 5 de diciembre de 2026/);
    expect(text).toContain("Coliseo Miraflores");
    expect(text).toMatch(/S\/\s15\.00/);
    expect(text).toContain("6 cupos libres");
  });

  it.each([
    [{ status: "published" as const, freeSeats: 1 }, "¡Queda 1 cupo!"],
    [{ status: "full" as const, freeSeats: 0 }, "Llena · lista de espera abierta"],
    [{ status: "cancelled" as const, freeSeats: 4 }, "Cancelada"],
  ])("HU-11: cupos %o → %s", (seats, expected) => {
    expect(seatsText(seats)).toBe(expected);
  });
});
