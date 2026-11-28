import type { VariantInput } from "@/modules/store";

const MAX_STOCK = 9999;
const SIZE_ENTRY = /^([^:=\s]+)\s*[:=]\s*(\d{1,4})$/;
const UNTRACKED: VariantInput[] = [{ size: null, stock: null }];

export interface StockInput {
  variants: VariantInput[];
  /** Free text shown instead of a count ("A pedido"); its stock isn't tracked. */
  stockNote: string | null;
}

/**
 * The stock field of the product form: "12" for a one-size product, "S:3, M:5, L:0" for stock
 * per size, or empty / any text ("A pedido") when it isn't tracked. Returns null when it looks
 * like a per-size list with a mistake, so a typo doesn't silently become "never runs out".
 */
export function parseStockInput(raw: string): StockInput | null {
  const text = raw.trim();
  if (!text) return { variants: UNTRACKED, stockNote: null };
  if (/^\d{1,4}$/.test(text))
    return { variants: [{ size: null, stock: Number(text) }], stockNote: null };
  // Only digits but not a valid count ("12345", "-3") is a mistake, not a note.
  if (/^[\d\s.,-]+$/.test(text)) return null;
  if (!/[:=]/.test(text)) return { variants: UNTRACKED, stockNote: text };
  const entries = text
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const variants: VariantInput[] = [];
  for (const entry of entries) {
    const match = SIZE_ENTRY.exec(entry);
    if (!match || Number(match[2]) > MAX_STOCK) return null;
    variants.push({ size: match[1]!, stock: Number(match[2]) });
  }
  return { variants, stockNote: null };
}

/** The reverse, to prefill the edit form and show the stock in the list. */
export function stockInputText({ variants, stockNote }: StockInput): string {
  const [first] = variants;
  if (variants.length === 1 && first!.size === null) {
    return first!.stock === null ? (stockNote ?? "") : String(first!.stock);
  }
  return variants.map((variant) => `${variant.size}:${variant.stock ?? ""}`).join(", ");
}
