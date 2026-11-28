import { VolleyballLoader } from "@/components/volleyball";
import { PanelIntro } from "../panel-hero";
import { CalendarDays, Clock, FileSpreadsheet } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Field, fieldClass } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatTimeRangeInLima, formatWeekdayDateInLima, parseLimaMonth } from "@/lib/lima-time";
import { centsToSolesText, formatSoles } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireOrganizer } from "../require-organizer";
import { CourtCostForm } from "./court-cost-form";
import { buildFinanceReport } from "./finance-report";

type Props = PageProps<"/admin/[club]/finanzas">;

export default function FinancePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<VolleyballLoader />}>
        <FinanceContent {...props} />
      </Suspense>
    </main>
  );
}

/** HU-34: what each event of the month collected, what the court cost and the profit. */
async function FinanceContent({ params, searchParams }: Props) {
  const clubSlug = (await params).club;
  const organizer = await requireOrganizer(clubSlug, "manage_club");
  if (!organizer) notFound();
  const month = parseLimaMonth((await searchParams).mes);
  const report = await buildFinanceReport(organizer.clubId, month);

  return (
    <div className="flex flex-col gap-6">
      <PanelIntro />
      <form className="flex items-end gap-2">
        <Field label="Mes" float="always" className="flex-1">
          <input type="month" name="mes" defaultValue={month} className={fieldClass} />
        </Field>
        <Button type="submit" variant="outline" className="h-11">
          Ver
        </Button>
      </form>
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Recaudado" cents={report.collectedCents} />
        <Stat label="Canchas" cents={report.courtCostCents} />
        <Stat label="Ganancia" cents={report.profitCents} highlight />
      </dl>
      <a
        href={`/admin/${clubSlug}/finanzas/csv?mes=${month}`}
        className={buttonVariants({ size: "lg", className: "h-11 gap-2" })}
      >
        <FileSpreadsheet aria-hidden />
        Exportar a Excel (CSV)
      </a>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Por convocatoria</h2>
        {report.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <CalendarDays className="size-8 opacity-60" aria-hidden />
            No hay convocatorias en este mes.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {report.rows.map((row) => (
              <li
                key={row.eventId}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate font-semibold">{row.title}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                      {formatWeekdayDateInLima(row.startsAt)}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" aria-hidden />
                      {formatTimeRangeInLima(row)}
                    </p>
                  </div>
                  {row.cancelled && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                      Cancelada
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/60 p-3 text-sm">
                  <RowAmount label="Inscripciones" cents={row.registrationsCents} />
                  <RowAmount label="Tienda" cents={row.storeCents} />
                  <RowAmount label="Ganancia" cents={row.profitCents} strong />
                </dl>
                {row.courtCostCents === null && (
                  <p className="text-xs text-muted-foreground">
                    Aún sin costo de cancha: la ganancia no lo descuenta.
                  </p>
                )}
                <div className="border-t pt-3">
                  <CourtCostForm
                    clubSlug={clubSlug}
                    eventId={row.eventId}
                    defaultValue={
                      row.courtCostCents === null ? "" : centsToSolesText(row.courtCostCents)
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  cents,
  highlight = false,
}: {
  label: string;
  cents: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-2xl border p-3 shadow-sm",
        highlight ? "border-primary bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <dt
        className={cn(
          "text-xs",
          highlight ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {label}
      </dt>
      <dd className="truncate text-base font-extrabold">{formatSoles(cents)}</dd>
    </div>
  );
}

function RowAmount({
  label,
  cents,
  strong = false,
}: {
  label: string;
  cents: number;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "truncate",
          strong
            ? cents < 0
              ? "font-bold text-red-600"
              : "font-bold text-emerald-700 dark:text-emerald-400"
            : "font-medium",
        )}
      >
        {formatSoles(cents)}
      </dd>
    </div>
  );
}
