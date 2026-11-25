import { listOpenEvents } from "@/modules/events";
import type { PickupEvents } from "../application/ports";

/** Pickup only at the club's upcoming published or full events (HU-24). */
export const pickupEventsAdapter: PickupEvents = {
  async isAvailable(clubSlug, eventId) {
    const events = await listOpenEvents(clubSlug);
    return events?.some((event) => event.id === eventId) ?? false;
  },
};
