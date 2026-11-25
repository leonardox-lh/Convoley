/** A plan's terms as players read them, e.g. "4 fechas · 30 días" or "Fechas ilimitadas · 30 días". */
export function planTermsText(plan: { creditCount: number | null; validityDays: number | null }) {
  const dates =
    plan.creditCount === null
      ? "Fechas ilimitadas"
      : `${plan.creditCount} ${plan.creditCount === 1 ? "fecha" : "fechas"}`;
  const validity = plan.validityDays === null ? "sin vencimiento" : `${plan.validityDays} días`;
  return `${dates} · ${validity}`;
}
