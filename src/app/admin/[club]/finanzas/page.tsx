import { ChartColumn } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Field, fieldClass } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatInLima, parseLimaMonth } from "@/lib/lima-time";
import { centsToSolesText, formatSoles } from "@/lib/money";
import { requireOrganizer } from "../require-organizer";
import { CourtCostForm } from "./court-cost-form";
import { buildFinanceReport } from "./finance-report";

type Props = PageProps<"/admin/[club]/finanzas">;

export default function FinancePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-8">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
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
      <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <ChartColumn className="size-5" aria-hidden />
          </span>
          Finanzas
        </h1>
      <form className="flex items-end gap-2">
        <Field label="Mes" float="always" className="flex-1">
          <input type="month" name="mes" defaultValue={month} className={fieldClass} />
        </Field>
        <Button type="submit" variant="outline" className="h-11">
          Ver
        </Button>
      </form>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Recaudado", report.collectedCents],
          ["Canchas", report.courtCostCents],
          ["Ganancia", report.profitCents],
        ].map(([label, cents]) => (
          <div key={label} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className="font-semibold">{formatSoles(Number(cents))}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-zinc-500">
        Solo cuenta pagos aprobados, con el cargo por servicio y sin descontar la comisión de
        Mercado Pago. Planes vendidos en el mes: {formatSoles(report.plansCents)}.
      </p>
      <a
        href={`/admin/${clubSlug}/finanzas/csv?mes=${month}`}
        className={buttonVariants({ size: "lg", className: "h-11" })}
      >
        Exportar a Excel (CSV)
      </a>
      {report.rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay convocatorias en este mes.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {report.rows.map((row) => (
            <li key={row.eventId} className="flex flex-col gap-2 py-4">
              <div>
                <p className="font-medium">
                  {row.title}
                  {row.cancelled && <span className="text-sm text-red-600"> · Cancelada</span>}
                </p>
                <p className="text-sm text-zinc-500">{formatInLima(row.startsAt)}</p>
              </div>
              <p className="text-sm">
                Inscripciones {formatSoles(row.registrationsCents)} · Tienda{" "}
                {formatSoles(row.storeCents)}
                <br />
                Ganancia <strong>{formatSoles(row.profitCents)}</strong>
                {row.courtCostCents === null && (
                  <span className="text-zinc-500"> (sin costo de cancha)</span>
                )}
              </p>
              <CourtCostForm
                clubSlug={clubSlug}
                eventId={row.eventId}
                defaultValue={
                  row.courtCostCents === null ? "" : centsToSolesText(row.courtCostCents)
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
