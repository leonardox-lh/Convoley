import type { VariantInput } from "@/modules/store";

const MAX_STOCK = 9999;
const SIZE_ENTRY = /^([^:=\s]+)\s*[:=]\s*(\d{1,4})$/;

/**
 * The stock field of the product form: "12" for a one-size product, or "S:3, M:5, L:0" for
 * stock per size. Returns null when it can't be read.
 */
export function parseStockInput(raw: string): VariantInput[] | null {
  const text = raw.trim();
  if (/^\d{1,4}$/.test(text)) return [{ size: null, stock: Number(text) }];
  const entries = text
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;
  const variants: VariantInput[] = [];
  for (const entry of entries) {
    const match = SIZE_ENTRY.exec(entry);
    if (!match || Number(match[2]) > MAX_STOCK) return null;
    variants.push({ size: match[1]!, stock: Number(match[2]) });
  }
  return variants;
}

/** The reverse, to prefill the edit form. */
export function stockInputText(variants: VariantInput[]): string {
  if (variants.length === 1 && variants[0]!.size === null) return String(variants[0]!.stock);
  return variants.map((variant) => `${variant.size}:${variant.stock}`).join(", ");
}
