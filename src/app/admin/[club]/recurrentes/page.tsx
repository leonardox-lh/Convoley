import { VolleyballLoader } from "@/components/volleyball";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SectionCard } from "@/components/page-heading";
import { PanelIntro } from "../panel-hero";
import { formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { findClubBySlug } from "@/modules/clubs";
import { listRecurringEvents, MAX_PUBLISH_DAYS_BEFORE, listClubVenues } from "@/modules/events";
import { requireOrganizer } from "../require-organizer";
import { NewRecurringEventForm, PauseForm } from "./recurring-forms";
import { startMinuteToTime, WEEKDAY_LABELS } from "./weekdays";

type Props = PageProps<"/admin/[club]/recurrentes">;

export default function RecurringEventsPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<VolleyballLoader />}>
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

  const active = templates.filter((template) => !template.isPaused).length;

  return (
    <div className="flex flex-col gap-6">
      <PanelIntro>
        Cada semana se publica una fecha nueva, los días antes que elijas. Para cambiar algo, pausa
        la recurrente y crea otra.
      </PanelIntro>
      {templates.length > 0 && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-secondary/40 px-4 py-3">
            <h2 className="text-sm font-semibold">Tus recurrentes</h2>
            <span className="text-xs text-muted-foreground">
              {active} activa{active === 1 ? "" : "s"} · {templates.length} en total
            </span>
          </div>
          <ul className="divide-y">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30"
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-xs leading-tight font-semibold",
                    template.isPaused
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {WEEKDAY_LABELS[template.weekday].slice(0, 3)}
                  <span className="text-[11px] font-medium opacity-80">
                    {startMinuteToTime(template.startMinute)}
                  </span>
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{template.title}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        template.isPaused
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {template.isPaused ? "Pausada" : "Activa"}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <Chip>{template.communityName}</Chip>
                    <Chip>{formatSoles(template.priceCents)}</Chip>
                    <Chip>{template.capacity} cupos</Chip>
                    {!template.isPaused && <Chip>{template.publishDaysBefore} días antes</Chip>}
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
        </section>
      )}
      <SectionCard title="Nueva recurrente" description="Llena los datos una vez y olvídate.">
        <NewRecurringEventForm
          clubSlug={clubSlug}
          communities={club.communities}
          savedVenues={await listClubVenues(club.slug)}
          maxPublishDaysBefore={MAX_PUBLISH_DAYS_BEFORE}
        />
      </SectionCard>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border bg-background px-1.5 py-0.5">{children}</span>;
}
