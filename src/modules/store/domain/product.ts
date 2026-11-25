import { InvalidProductError } from "./errors";

export const MAX_PRODUCT_PHOTOS = 5;
export const PRODUCT_NAME_MAX_LENGTH = 80;
export const SIZE_MAX_LENGTH = 10;

export interface VariantInput {
  /** null = the product comes in one size only. */
  size: string | null;
  stock: number;
}

export interface ProductInput {
  name: string;
  description: string | null;
  priceCents: number;
  variants: VariantInput[];
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
  if (variants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0)) {
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
  return {
    name,
    description: input.description?.trim() || null,
    priceCents: input.priceCents,
    variants,
  };
}
