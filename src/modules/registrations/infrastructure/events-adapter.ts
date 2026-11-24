import type { EventSeats } from "../application/ports";
import { toPrismaTx } from "./prisma-registration-repository";

// `events` imports this module at load time, so it is imported lazily here to avoid a cycle.
const loadEvents = () => import("@/modules/events");

export const eventsAdapter: EventSeats = {
  async lock(eventId, tx) {
    const { lockEventForRegistration } = await loadEvents();
    return lockEventForRegistration(eventId, toPrismaTx(tx));
  },
  async markFull(eventId, tx) {
    const { markEventFull } = await loadEvents();
    await markEventFull(eventId, toPrismaTx(tx));
  },
};
