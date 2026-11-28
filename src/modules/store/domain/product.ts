import { InvalidProductError } from "./errors";

export const MAX_PRODUCT_PHOTOS = 5;
export const PRODUCT_NAME_MAX_LENGTH = 80;
export const SIZE_MAX_LENGTH = 10;
export const STOCK_NOTE_MAX_LENGTH = 40;

export interface VariantInput {
  /** null = the product comes in one size only. */
  size: string | null;
  /** null = not tracked: it never runs out. */
  stock: number | null;
}

export interface ProductInput {
  name: string;
  description: string | null;
  priceCents: number;
  variants: VariantInput[];
  /** Shown instead of a count when the stock isn't tracked ("A pedido"). */
  stockNote: string | null;
}

/**
 * HU-23: a product has a name, a price and its stock: either one variant without size or
 * one per size (S, M, L…), never both, with no repeated sizes.
 */
export function validateProduct(input: ProductInput): ProductInput {
  const name = input.name.trim();
  if (!name || name.length > PRODUCT_NAME_MAX_LENGTH) throw new InvalidProductError("name");
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) {
    throw new InvalidProductError("price");
  }
  const variants = input.variants.map((variant) => ({
    size: variant.size?.trim().toUpperCase() || null,
    stock: variant.stock,
  }));
  if (variants.length === 0) throw new InvalidProductError("no_variants");
  const validStock = (stock: number | null) =>
    stock === null || (Number.isInteger(stock) && stock >= 0);
  if (!variants.every((variant) => validStock(variant.stock))) {
    throw new InvalidProductError("stock");
  }
  const sized = variants.filter((variant) => variant.size !== null);
  if (sized.length > 0 && sized.length !== variants.length) {
    throw new InvalidProductError("mixed_sizes");
  }
  if (sized.length === 0 && variants.length > 1) throw new InvalidProductError("mixed_sizes");
  if (sized.some((variant) => variant.size!.length > SIZE_MAX_LENGTH)) {
    throw new InvalidProductError("size");
  }
  if (new Set(sized.map((variant) => variant.size)).size !== sized.length) {
    throw new InvalidProductError("duplicate_size");
  }
  const stockNote = input.stockNote?.trim() || null;
  if (stockNote && stockNote.length > STOCK_NOTE_MAX_LENGTH) {
    throw new InvalidProductError("stock_note");
  }
  return {
    name,
    description: input.description?.trim() || null,
    priceCents: input.priceCents,
    variants,
    stockNote,
  };
}
