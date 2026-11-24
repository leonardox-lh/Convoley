const CENTS_PER_SOL = 100;
// Up to S/ 99,999.99 with at most two decimals; "15", "15.5" and "15,50" are valid.
const SOLES_FORMAT = /^(\d{1,5})(?:[.,](\d{1,2}))?$/;

/** Parses an amount typed in soles into integer cents without going through floats. */
export function solesToCents(raw: string): number | null {
  const match = SOLES_FORMAT.exec(raw.trim());
  if (!match) return null;
  const [, soles, decimals = ""] = match;
  return Number(soles) * CENTS_PER_SOL + Number(decimals.padEnd(2, "0"));
}

const solesFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

export function formatSoles(cents: number): string {
  return solesFormatter.format(cents / CENTS_PER_SOL);
}
