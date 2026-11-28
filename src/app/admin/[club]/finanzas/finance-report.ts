import { limaMonthRange } from "@/lib/lima-time";
import { listClubEventsForFinance } from "@/modules/events";
import { sumApprovedPaymentsByOwner, sumApprovedPlanPayments } from "@/modules/payments";
import { listRegistrationEventIds } from "@/modules/registrations";
import { listOrderPickupEventIds } from "@/modules/store";

export interface FinanceRow {
  eventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  cancelled: boolean;
  registrationsCents: number;
  storeCents: number;
  collectedCents: number;
  /** Null while the organizer hasn't recorded it. */
  courtCostCents: number | null;
  /** Collected minus court cost; without a cost it equals what was collected. */
  profitCents: number;
}

export interface FinanceReport {
  month: string;
  rows: FinanceRow[];
  plansCents: number;
  collectedCents: number;
  courtCostCents: number;
  profitCents: number;
}

const sumBy = (
  owners: { id: string; eventId: string }[],
  totals: Map<string, number>,
  eventId: string,
) =>
  owners
    .filter((owner) => owner.eventId === eventId)
    .reduce((sum, owner) => sum + (totals.get(owner.id) ?? 0), 0);

/**
 * HU-34: money of the club's events of a month in Lima. Registrations and store orders count
 * in their event; plans count apart, in the month they were paid. Only approved payments.
 */
export async function buildFinanceReport(clubId: string, month: string): Promise<FinanceReport> {
  const { from, to } = limaMonthRange(month);
  const events = await listClubEventsForFinance({ clubId, from, to });
  const eventIds = events.map((event) => event.id);
  const [registrations, orders, plansCents] = await Promise.all([
    listRegistrationEventIds(eventIds),
    listOrderPickupEventIds(eventIds),
    sumApprovedPlanPayments({ clubId, from, to }),
  ]);
  const orderOwners = orders.map((order) => ({ id: order.id, eventId: order.pickupEventId }));
  const totals = await sumApprovedPaymentsByOwner({
    registrationIds: registrations.map((registration) => registration.id),
    orderIds: orderOwners.map((order) => order.id),
  });

  const rows = events.map((event): FinanceRow => {
    const registrationsCents = sumBy(registrations, totals, event.id);
    const storeCents = sumBy(orderOwners, totals, event.id);
    const collectedCents = registrationsCents + storeCents;
    return {
      eventId: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      cancelled: event.status === "cancelled",
      registrationsCents,
      storeCents,
      collectedCents,
      courtCostCents: event.courtCostCents,
      profitCents: collectedCents - (event.courtCostCents ?? 0),
    };
  });
  const total = (pick: (row: FinanceRow) => number) =>
    rows.reduce((sum, row) => sum + pick(row), 0);
  const courtCostCents = total((row) => row.courtCostCents ?? 0);
  const collectedCents = total((row) => row.collectedCents) + plansCents;
  return {
    month,
    rows,
    plansCents,
    collectedCents,
    courtCostCents,
    profitCents: collectedCents - courtCostCents,
  };
}
