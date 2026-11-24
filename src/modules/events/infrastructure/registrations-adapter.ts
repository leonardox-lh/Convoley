import {
  countConfirmedRegistrations,
  countConfirmedRegistrationsByEvent,
  listEventRegistrationIds,
} from "@/modules/registrations";
import type { ConfirmedCountsReader, RegistrationsReader } from "../application/ports";
import { toPrismaTx } from "./prisma-transactions";

export const registrationsAdapter: RegistrationsReader & ConfirmedCountsReader = {
  countConfirmed: (eventId, tx) =>
    countConfirmedRegistrations(eventId, tx ? toPrismaTx(tx) : undefined),
  countConfirmedByEvent: (eventIds) => countConfirmedRegistrationsByEvent(eventIds),
  listIds: (eventId, tx) => listEventRegistrationIds(eventId, toPrismaTx(tx)),
};
