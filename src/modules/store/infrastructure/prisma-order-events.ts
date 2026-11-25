import { db } from "@/lib/db";

/** HU-34: orders picked up at these events, for the finance panel. */
export function listOrderPickupEventIds(eventIds: string[]) {
  return db.order.findMany({
    where: { pickupEventId: { in: eventIds } },
    select: { id: true, pickupEventId: true },
  });
}
