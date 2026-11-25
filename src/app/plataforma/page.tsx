import type { Metadata } from "next";
import { Suspense } from "react";
import { Field, fieldClass } from "@/components/form";
import { Button } from "@/components/ui/button";
import { formatDateInLima, limaMonthRange, parseLimaMonth } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { listSubscriptions, MONTHLY_PRICE_CENTS, type SubscriptionStatus } from "@/modules/billing";
import { listAllClubs } from "@/modules/clubs";
import { listEventsStartingBetween } from "@/modules/events";
import { countConfirmedRegistrationsByEvent } from "@/modules/registrations";
import { recordPaymentAction, setSuspendedAction } from "./actions";
import { requirePlatformAdmin } from "./require-platform-admin";

export const metadata: Metadata = { title: "Plataforma · Convoley", robots: { index: false } };

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: "Prueba",
  active: "Activo",
  read_only: "Solo lectura",
  suspended: "Suspendido",
};

export default function PlatformPage(props: PageProps<"/plataforma">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <PlatformContent {...props} />
      </Suspense>
    </main>
  );
}

/** HU-36: every club with its subscription and this month's usage, for the Convoley owner. */
async function PlatformContent({ searchParams }: PageProps<"/plataforma">) {
  await requirePlatformAdmin();
  const month = parseLimaMonth((await searchParams).mes);
  const { from, to } = limaMonthRange(month);
  const [clubs, subscriptions, events] = await Promise.all([
    listAllClubs(),
    listSubscriptions(),
    listEventsStartingBetween(from, to),
  ]);
  const registrationsByEvent = await countConfirmedRegistrationsByEvent(events.map((e) => e.id));
  const usage = new Map<string, { events: number; registrations: number }>();
  for (const event of events) {
    const club = usage.get(event.clubId) ?? { events: 0, registrations: 0 };
    club.events += 1;
    club.registrations += registrationsByEvent.get(event.id) ?? 0;
    usage.set(event.clubId, club);
  }
  const subscriptionByClub = new Map(subscriptions.map((s) => [s.subscription.clubId, s]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clubes en Convoley</h1>
        <form className="flex items-end gap-2">
          <Field label="Mes" float="always">
            <input type="month" name="mes" defaultValue={month} className={fieldClass} />
          </Field>
          <Button type="submit" variant="outline" className="h-11">
            Ver
          </Button>
        </form>
      </div>
      <p className="text-sm text-zinc-500">
        {clubs.length} clubes · {events.length} convocatorias y{" "}
        {[...usage.values()].reduce((sum, club) => sum + club.registrations, 0)} inscritos en{" "}
        {month}.
      </p>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {clubs.map((club) => {
          const entry = subscriptionByClub.get(club.id);
          const clubUsage = usage.get(club.id) ?? { events: 0, registrations: 0 };
          return (
            <li key={club.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {club.name} <span className="text-sm text-zinc-500">/{club.slug}</span>
                </span>
                <span className="text-sm">
                  {entry ? STATUS_LABELS[entry.access.status] : "Sin suscripción"}
                  {entry && ` · hasta el ${formatDateInLima(entry.access.accessEndsAt)}`}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Creado el {formatDateInLima(club.createdAt)} · {clubUsage.events} convocatorias ·{" "}
                {clubUsage.registrations} inscritos en el mes
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={recordPaymentAction}>
                  <input type="hidden" name="clubId" value={club.id} />
                  <input
                    type="hidden"
                    name="expectedPaidUntil"
                    value={entry?.subscription.paidUntil?.toISOString() ?? ""}
                  />
                  <Button type="submit" size="sm">
                    Registrar pago ({formatSoles(MONTHLY_PRICE_CENTS)})
                  </Button>
                </form>
                <form action={setSuspendedAction}>
                  <input type="hidden" name="clubId" value={club.id} />
                  <input
                    type="hidden"
                    name="suspended"
                    value={entry?.subscription.suspendedAt ? "false" : "true"}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    {entry?.subscription.suspendedAt ? "Reactivar" : "Suspender"}
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
