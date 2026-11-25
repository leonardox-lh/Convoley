import type { ProductInput } from "../domain/product";
import type {
  ProductImages,
  ProductRepository,
  StoredProduct,
  TransactionContext,
  TransactionRunner,
} from "./ports";

// In-memory fakes with the same contract as the real ports, shared by the application tests.
export const FAKE_TX = { fake: true } as unknown as TransactionContext;
export const fakeTransactions: TransactionRunner = { run: (work) => work(FAKE_TX) };

export function storedProduct(overrides: Partial<StoredProduct> = {}): StoredProduct {
  return {
    id: "prod-1",
    clubId: "club-1",
    name: "Polo",
    description: null,
    priceCents: 4500,
    imageKeys: [],
    isActive: true,
    variants: [
      { id: "var-s", size: "S", stock: 3 },
      { id: "var-m", size: "M", stock: 1 },
    ],
    ...overrides,
  };
}

export function fakeProductRepository(initial: StoredProduct[] = []) {
  const rows = [...initial];
  const find = (id: string) => rows.find((row) => row.id === id)!;
  const variantsOf = (product: ProductInput, previous: StoredProduct["variants"] = []) => {
    const updated = product.variants.map((variant, index) => ({
      id: previous.find((old) => old.size === variant.size)?.id ?? `var-${rows.length}-${index}`,
      ...variant,
    }));
    const dropped = previous
      .filter((old) => !product.variants.some((variant) => variant.size === old.size))
      .map((old) => ({ ...old, stock: 0 }));
    return [...updated, ...dropped];
  };
  const products: ProductRepository = {
    create: async (clubId, product) => {
      const id = `prod-${rows.length + 1}`;
      rows.push({
        id,
        clubId,
        imageKeys: [],
        isActive: true,
        ...product,
        variants: variantsOf(product),
      });
      return { id };
    },
    find: async (clubId, id) => rows.find((row) => row.id === id && row.clubId === clubId) ?? null,
    update: async (id, product) => {
      const row = find(id);
      Object.assign(row, product, { variants: variantsOf(product, row.variants) });
    },
    appendImageKey: async (id, key, max) => {
      const row = find(id);
      if (row.imageKeys.length >= max) return false;
      row.imageKeys.push(key);
      return true;
    },
    removeImageKey: async (id, key) => {
      const row = find(id);
      row.imageKeys = row.imageKeys.filter((existing) => existing !== key);
    },
    setActive: async (id, isActive) => {
      find(id).isActive = isActive;
    },
  };
  return { products, rows };
}

export function fakeProductImages() {
  const saved: string[] = [];
  const images: ProductImages = {
    save: async (clubSlug) => {
      const key = `${clubSlug}-${saved.length + 1}.jpg`;
      saved.push(key);
      return key;
    },
  };
  return { images, saved };
}
