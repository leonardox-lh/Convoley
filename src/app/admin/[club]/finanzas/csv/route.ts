import { limaDateAndTime, parseLimaMonth } from "@/lib/lima-time";
import { centsToSolesText } from "@/lib/money";
import { requireOrganizer } from "../../require-organizer";
import { buildFinanceReport } from "../finance-report";

// Excel only reads UTF-8 (tildes) when the file starts with a byte order mark.
const UTF8_BOM = String.fromCharCode(0xfeff);
// A cell starting with one of these runs as a formula in Excel: prefix it to show it as text.
const FORMULA_START = /^[=+\-@]/;

const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
// Only free text typed by organizers needs it; amounts stay numbers (a loss starts with "-").
const text = (value: string) => (FORMULA_START.test(value) ? `'${value}` : value);
const amount = (cents: number | null) =>
  cents === null ? "" : cents < 0 ? `-${centsToSolesText(-cents)}` : centsToSolesText(cents);

/** HU-34: the month's finance report as a CSV that Excel opens. */
export async function GET(request: Request, context: RouteContext<"/admin/[club]/finanzas/csv">) {
  const { club: clubSlug } = await context.params;
  const organizer = await requireOrganizer(clubSlug, "manage_club");
  if (!organizer) return new Response(null, { status: 404 });
  const month = parseLimaMonth(new URL(request.url).searchParams.get("mes"));
  const report = await buildFinanceReport(organizer.clubId, month);

  const lines = [
    [
      "Fecha",
      "Hora",
      "Convocatoria",
      "Estado",
      "Inscripciones (S/)",
      "Tienda (S/)",
      "Recaudado (S/)",
      "Costo de cancha (S/)",
      "Ganancia (S/)",
    ],
    ...report.rows.map((row) => {
      const { date, time } = limaDateAndTime(row.startsAt);
      return [
        date,
        time,
        text(row.title),
        row.cancelled ? "Cancelada" : "Activa",
        amount(row.registrationsCents),
        amount(row.storeCents),
        amount(row.collectedCents),
        amount(row.courtCostCents),
        amount(row.profitCents),
      ];
    }),
    [
      "",
      "",
      "Planes vendidos",
      "",
      "",
      "",
      amount(report.plansCents),
      "",
      amount(report.plansCents),
    ],
    [
      "",
      "",
      "Total",
      "",
      "",
      "",
      amount(report.collectedCents),
      amount(report.courtCostCents),
      amount(report.profitCents),
    ],
  ];
  const csv = UTF8_BOM + lines.map((line) => line.map(cell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-${month}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
