"use server";

import { z } from "zod";
import { loadUpcomingEventCards } from "./upcoming-event-cards";
import { UPCOMING_PAGE_SIZE } from "./page-size";

const offsetSchema = z.number().int().min(0);

/** The next page of upcoming events, for the list that loads more as you scroll. */
export async function loadMoreUpcomingEventsAction(offset: number) {
  return loadUpcomingEventCards(UPCOMING_PAGE_SIZE, offsetSchema.parse(offset));
}
