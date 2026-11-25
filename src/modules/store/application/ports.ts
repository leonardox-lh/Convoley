import type { ProductInput } from "../domain/product";

declare const transactionBrand: unique symbol;
/** Handle of a running database transaction; only infrastructure looks inside it. */
export type TransactionContext = { readonly [transactionBrand]: true };

export interface TransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface StoredVariant {
  id: string;
  size: string | null;
  stock: number;
}

export interface StoredProduct {
  id: string;
  clubId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageKeys: string[];
  isActive: boolean;
  variants: StoredVariant[];
}

export interface ProductRepository {
  create(clubId: string, product: ProductInput): Promise<{ id: string }>;
  find(clubId: string, productId: string): Promise<StoredProduct | null>;
  /** Variants are matched by size; a size left out keeps its row (it may have sales) with stock 0. */
  update(productId: string, product: ProductInput): Promise<void>;
  /** Adds the photo only while the product has fewer than `max`; false when it was full. */
  appendImageKey(productId: string, key: string, max: number): Promise<boolean>;
  removeImageKey(productId: string, key: string): Promise<void>;
  setActive(productId: string, isActive: boolean): Promise<void>;
}

/** Public product photos, stored like the club's logo (owned by `clubs`). */
export interface ProductImages {
  save(clubSlug: string, image: { bytes: Uint8Array; contentType: string }): Promise<string>;
}
