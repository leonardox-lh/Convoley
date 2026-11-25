import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatSoles } from "@/lib/money";
import { findClubBySlug } from "@/modules/clubs";
import { listRecurringEvents, MAX_PUBLISH_DAYS_BEFORE } from "@/modules/events";
import { requireOrganizer } from "../require-organizer";
import { NewRecurringEventForm, PauseForm } from "./recurring-forms";
import { startMinuteToTime, WEEKDAY_LABELS } from "./weekdays";

type Props = PageProps<"/admin/[club]/recurrentes">;

export default function RecurringEventsPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <RecurringEventsContent params={params} />
      </Suspense>
    </main>
  );
}

async function RecurringEventsContent({ params }: Pick<Props, "params">) {
  const clubSlug = (await params).club;
  if (!(await requireOrganizer(clubSlug, "manage_club"))) notFound();
  const [club, templates] = await Promise.all([
    findClubBySlug(clubSlug),
    listRecurringEvents(clubSlug),
  ]);
  if (!club) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/${clubSlug}`} className="text-sm text-zinc-500 underline">
          Volver al club
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Convocatorias recurrentes</h1>
        <p className="text-sm text-zinc-500">
          Cada semana se publica una fecha nueva, los días antes que elijas. Para cambiar algo,
          pausa la recurrente y crea otra.
        </p>
      </div>
      {templates.length > 0 && (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {templates.map((template) => (
            <li key={template.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="font-medium">{template.title}</span>
                <span className="text-sm text-zinc-500">
                  {WEEKDAY_LABELS[template.weekday]} {startMinuteToTime(template.startMinute)} ·{" "}
                  {template.communityName} · {formatSoles(template.priceCents)} ·{" "}
                  {template.capacity} cupos
                </span>
                <span className="text-sm text-zinc-500">
                  {template.isPaused
                    ? "Pausada"
                    : `Se publica ${template.publishDaysBefore} días antes`}
                </span>
              </div>
              <PauseForm
                clubSlug={clubSlug}
                recurringEventId={template.id}
                isPaused={template.isPaused}
              />
            </li>
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nueva recurrente</h2>
        <NewRecurringEventForm
          clubSlug={clubSlug}
          communities={club.communities}
          maxPublishDaysBefore={MAX_PUBLISH_DAYS_BEFORE}
        />
      </section>
    </div>
  );
}
