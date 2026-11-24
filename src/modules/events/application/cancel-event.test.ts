import { describe, expect, it } from "vitest";
import {
  ClubNotFoundError,
  EventAlreadyCancelledError,
  EventNotFoundError,
} from "../domain/errors";
import { CLUB, FAKE_TX, eventDetails, fakeEventRepository, fakeTransactions } from "./fakes";
import { makeCancelEvent } from "./cancel-event";
import type { EventDetails } from "./ports";

const NOW = new Date("2026-12-01T12:00:00.000Z");

function setup(stored: EventDetails | null, options: { markerFails?: boolean } = {}) {
  const calls: string[] = [];
  const marked: unknown[] = [];
  const cancelled: unknown[] = [];
  const cancelEvent = makeCancelEvent({
    clubs: { findBySlug: async (slug) => (slug === CLUB.slug ? CLUB : null) },
    events: fakeEventRepository({
      lockInClub: async (clubId, id) =>
        stored && stored.clubId === clubId && stored.id === id ? stored : null,
      markCancelled: async (id, cancellation, tx) => {
        expect(tx).toBe(FAKE_TX);
        calls.push("markCancelled");
        cancelled.push({ id, ...cancellation });
      },
    }),
    registrations: {
      countConfirmed: async () => 0,
      listIds: async () => ["reg-1", "reg-2"],
      promoteWaitlisted: async () => 0,
    },
    payments: {
      markForCancellation: async (marking, tx) => {
        expect(tx).toBe(FAKE_TX);
        calls.push("markForCancellation");
        if (options.markerFails) throw new Error("db down");
        marked.push(marking);
      },
    },
    transactions: fakeTransactions,
    now: () => NOW,
  });
  return { cancelEvent, calls, marked, cancelled };
}

const input = { clubSlug: CLUB.slug, eventId: "evt-1", outcome: "refund" as const };

describe("HU-05 criterio 3: cancelEvent marca los pagos", () => {
  it("HU-05: marca los pagos de las inscripciones con el outcome elegido", async () => {
    const { cancelEvent, marked } = setup(eventDetails());
    await cancelEvent({ ...input, outcome: "balance" });
    expect(marked).toEqual([{ registrationIds: ["reg-1", "reg-2"], outcome: "balance" }]);
  });

  it("HU-05: marca los pagos antes de marcar el evento, en la misma transaccion", async () => {
    const { cancelEvent, calls } = setup(eventDetails());
    await cancelEvent(input);
    expect(calls).toEqual(["markForCancellation", "markCancelled"]);
  });

  it("HU-05: el evento queda cancelado con la fecha actual y el outcome", async () => {
    const { cancelEvent, cancelled } = setup(eventDetails());
    await cancelEvent({ ...input, outcome: "balance" });
    expect(cancelled).toEqual([{ id: "evt-1", at: NOW, outcome: "balance" }]);
  });

  it("HU-05: si el marcador de pagos falla, el evento no se marca cancelado", async () => {
    const { cancelEvent, calls } = setup(eventDetails(), { markerFails: true });
    await expect(cancelEvent(input)).rejects.toThrow("db down");
    expect(calls).toEqual(["markForCancellation"]);
  });
});

describe("HU-05: cancelEvent casos borde", () => {
  it("HU-05: una convocatoria ya cancelada falla y no marca nada", async () => {
    const { cancelEvent, calls } = setup(eventDetails({ status: "cancelled" }));
    await expect(cancelEvent(input)).rejects.toThrow(EventAlreadyCancelledError);
    expect(calls).toHaveLength(0);
  });

  it("HU-05: evento inexistente falla con EventNotFoundError", async () => {
    const { cancelEvent, calls } = setup(null);
    await expect(cancelEvent(input)).rejects.toThrow(EventNotFoundError);
    expect(calls).toHaveLength(0);
  });

  it("HU-05: evento de otro club falla con EventNotFoundError", async () => {
    const { cancelEvent } = setup(eventDetails({ clubId: "otro-club" }));
    await expect(cancelEvent(input)).rejects.toThrow(EventNotFoundError);
  });

  it("HU-05: club inexistente falla", async () => {
    const { cancelEvent } = setup(eventDetails());
    await expect(cancelEvent({ ...input, clubSlug: "no" })).rejects.toThrow(ClubNotFoundError);
  });

  it.each(["draft", "published", "full", "closed"] as const)(
    "HU-05: se puede cancelar una convocatoria %s",
    async (status) => {
      const { cancelEvent, cancelled } = setup(eventDetails({ status }));
      await cancelEvent(input);
      expect(cancelled).toHaveLength(1);
    },
  );
});
