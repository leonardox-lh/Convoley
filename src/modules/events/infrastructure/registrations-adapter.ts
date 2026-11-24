import { countConfirmedRegistrations, listEventRegistrationIds } from "@/modules/registrations";
import type { RegistrationsReader } from "../application/ports";
import { toPrismaTx } from "./prisma-transactions";

export const registrationsAdapter: RegistrationsReader = {
  countConfirmed: (eventId, tx) =>
    countConfirmedRegistrations(eventId, tx ? toPrismaTx(tx) : undefined),
  listIds: (eventId, tx) => listEventRegistrationIds(eventId, toPrismaTx(tx)),
};
