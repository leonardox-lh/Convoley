import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { EventDetails, EventRepository, TransactionContext } from "../application/ports";
import type {
  CancellationOutcome,
  EventDetailsProps,
  EventStatus,
  NewEvent,
} from "../domain/event";
import { toPrismaTx } from "./prisma-transactions";

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(event: NewEvent): Promise<{ id: string }> {
    return this.db.event.create({ data: event, select: { id: true } });
  }

  async findInClub(clubId: string, eventId: string): Promise<EventDetails | null> {
    return findInClub(this.db, clubId, eventId);
  }

  async listInClub(
    clubId: string,
    filter: { statuses: readonly EventStatus[]; from: Date },
  ): Promise<EventDetails[]> {
    const rows = await this.db.event.findMany({
      where: { clubId, status: { in: [...filter.statuses] }, startsAt: { gte: filter.from } },
      include: EVENT_INCLUDE,
      orderBy: { startsAt: "asc" },
    });
    return rows.map(toEventDetails);
  }

  async lockInClub(
    clubId: string,
    eventId: string,
    tx: TransactionContext,
  ): Promise<EventDetails | null> {
    const client = toPrismaTx(tx);
    await client.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} AND "clubId" = ${clubId} FOR UPDATE`;
    return findInClub(client, clubId, eventId);
  }

  async update(
    eventId: string,
    changes: EventDetailsProps & { status: EventStatus },
    tx: TransactionContext,
  ): Promise<void> {
    await toPrismaTx(tx).event.update({ where: { id: eventId }, data: changes });
  }

  async markCancelled(
    eventId: string,
    cancellation: { at: Date; outcome: CancellationOutcome },
    tx: TransactionContext,
  ): Promise<void> {
    await toPrismaTx(tx).event.update({
      where: { id: eventId },
      data: {
        status: "cancelled",
        cancelledAt: cancellation.at,
        cancellationOutcome: cancellation.outcome,
      },
    });
  }
}

async function findInClub(
  client: Prisma.TransactionClient,
  clubId: string,
  eventId: string,
): Promise<EventDetails | null> {
  const row = await client.event.findFirst({
    where: { id: eventId, clubId },
    include: EVENT_INCLUDE,
  });
  return row ? toEventDetails(row) : null;
}

const EVENT_INCLUDE = { community: { select: { name: true } } } as const;

function toEventDetails(
  row: Prisma.EventGetPayload<{ include: typeof EVENT_INCLUDE }>,
): EventDetails {
  return {
    id: row.id,
    clubId: row.clubId,
    communityId: row.communityId,
    communityName: row.community.name,
    title: row.title,
    startsAt: row.startsAt,
    venueName: row.venueName,
    mapsUrl: row.mapsUrl,
    priceCents: row.priceCents,
    capacity: row.capacity,
    isMixed: row.isMixed,
    rules: row.rules,
    status: row.status,
    cancellationOutcome: row.cancellationOutcome,
  };
}
