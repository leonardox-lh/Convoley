import { describe, expect, it } from "vitest";
import { PlayerDetailsLockedError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import { makeEditOwnDetails, makeGetEditableOwnDetails } from "./edit-own-details";
import {
  fakeEventSeats,
  fakeRegistrationRepository,
  fakeTransactions,
  seatInfo,
  type StoredRegistration,
} from "./fakes";
import type { RegistrationListItem } from "./ports";

const NOW = new Date("2026-11-24T12:00:00Z");
const NEW_DETAILS = { position: "middle_blocker", level: "advanced", gender: "female" } as const;

function stored(id: string, overrides: Partial<StoredRegistration & { teamNumber: number }> = {}) {
  return {
    id,
    eventId: "evt-1",
    status: "pending_payment",
    firstName: "Ana",
    lastName: id,
    phone: null,
    userId: null,
    position: "setter",
    level: null,
    gender: null,
    ...overrides,
  } as StoredRegistration & { teamNumber?: number };
}

function setup(rowsIn: ReturnType<typeof stored>[], event: EventSeatInfo = seatInfo()) {
  const { repository, rows } = fakeRegistrationRepository(rowsIn);
  const deps = {
    events: fakeEventSeats(event).seats,
    registrations: repository,
    // Reads the same rows, so an edit shows up in the next read.
    list: {
      listByEvent: async () =>
        rows.map((row) => ({ teamNumber: null, ...row }) as unknown as RegistrationListItem),
    },
    transactions: fakeTransactions,
    now: () => NOW,
  };
  return {
    rows,
    edit: makeEditOwnDetails(deps),
    get: makeGetEditableOwnDetails(deps),
  };
}

describe("editOwnDetails", () => {
  it("changes the player's position, level and gender and keeps their place", async () => {
    const { rows, edit, get } = setup([stored("a"), stored("b")]);
    await edit({ registrationId: "a", details: NEW_DETAILS });
    expect(await get("a")).toEqual(NEW_DETAILS);
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(rows[0]!.status).toBe("pending_payment");
  });

  it("is locked once the teams are built", async () => {
    const { edit, get } = setup([stored("a"), stored("b", { teamNumber: 1 })]);
    expect(await get("a")).toBeNull();
    await expect(edit({ registrationId: "a", details: NEW_DETAILS })).rejects.toThrow(
      PlayerDetailsLockedError,
    );
  });

  it("is locked after cancelling or once the event started", async () => {
    expect(await setup([stored("a", { status: "cancelled" })]).get("a")).toBeNull();
    const started = setup([stored("a")], seatInfo({ startsAt: new Date("2026-11-24T11:00:00Z") }));
    expect(await started.get("a")).toBeNull();
  });
});
