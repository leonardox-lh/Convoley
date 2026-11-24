import { describe, expect, it } from "vitest";
import type { RegistrationStatus } from "./registration";
import { buildRoster, rosterText } from "./roster";

const at = (minute: number) => new Date(Date.UTC(2026, 11, 1, 10, minute));
const row = (firstName: string, status: RegistrationStatus, minute: number) => ({
  firstName,
  lastName: "Paz",
  status,
  createdAt: at(minute),
});

const registrations = [
  row("Leo", "paid", 20),
  row("Ana", "pending_payment", 5),
  row("Eva", "cancelled", 10),
  row("Sol", "in_review", 30),
  row("Max", "waitlisted", 50),
  row("Ivo", "waitlisted", 40),
];

describe("HU-16 criterio 2: lista numerada que marca quién pagó", () => {
  it("HU-16: numera por orden de inscripción, sin cancelados, y marca a los que pagaron", () => {
    expect(buildRoster(registrations).players).toEqual([
      { number: 1, name: "Ana Paz", paid: false },
      { number: 2, name: "Leo Paz", paid: true },
      { number: 3, name: "Sol Paz", paid: false },
    ]);
  });

  it("HU-16: la lista de espera va aparte, por orden de llegada", () => {
    expect(buildRoster(registrations).waitlist).toEqual([
      { number: 1, name: "Ivo Paz" },
      { number: 2, name: "Max Paz" },
    ]);
  });
});

describe("HU-17: lista como texto para WhatsApp", () => {
  const text = rosterText({
    title: "Martes mixto",
    when: "martes, 1 de diciembre, 8:00 p. m.",
    roster: buildRoster(registrations),
  });

  it("HU-17 criterio 1: formato 1. Nombre ✅ para quien pagó", () => {
    expect(text).toContain("1. Ana Paz\n2. Leo Paz ✅\n3. Sol Paz");
  });

  it("HU-17 criterio 2: incluye la lista de espera", () => {
    expect(text).toContain("*Lista de espera*\n1. Ivo Paz\n2. Max Paz");
  });

  it("HU-17: sin espera no agrega la sección", () => {
    const withoutWaitlist = rosterText({
      title: "X",
      when: "Y",
      roster: buildRoster([row("Ana", "paid", 1)]),
    });
    expect(withoutWaitlist).toBe("*X*\nY\n\n1. Ana Paz ✅");
  });
});
