import { ProductNotFoundError, TooManyPhotosError } from "../domain/errors";
import { MAX_PRODUCT_PHOTOS, validateProduct, type ProductInput } from "../domain/product";
import type { ProductImages, ProductRepository } from "./ports";

interface Deps {
  products: ProductRepository;
}

/** HU-23: the organizer publishes a product with its price and stock per size. */
export function makeCreateProduct(deps: Deps) {
  return (input: { clubId: string; product: ProductInput }) =>
    deps.products.create(input.clubId, validateProduct(input.product));
}

async function requireProduct(deps: Deps, clubId: string, productId: string) {
  const product = await deps.products.find(clubId, productId);
  if (!product) throw new ProductNotFoundError(productId);
  return product;
}

/**
 * HU-23: edit a product. `loadedVariants` is the stock the form showed: a size the organizer
 * didn't change keeps the stored stock, so saving a new price doesn't undo sales made meanwhile.
 */
export function makeUpdateProduct(deps: Deps) {
  return async (input: {
    clubId: string;
    productId: string;
    product: ProductInput;
    loadedVariants: ProductInput["variants"];
  }) => {
    const product = validateProduct(input.product);
    await requireProduct(deps, input.clubId, input.productId);
    const keepStockOf = product.variants
      .filter((variant) =>
        input.loadedVariants.some(
          (loaded) => loaded.size === variant.size && loaded.stock === variant.stock,
        ),
      )
      .map((variant) => variant.size);
    await deps.products.update(input.productId, product, keepStockOf);
  };
}

export function makeSetProductActive(deps: Deps) {
  return async (input: { clubId: string; productId: string; isActive: boolean }) => {
    await requireProduct(deps, input.clubId, input.productId);
    await deps.products.setActive(input.productId, input.isActive);
  };
}

/** HU-23: up to 5 photos per product. */
export function makeAddProductPhoto(deps: Deps & { images: ProductImages }) {
  return async (input: {
    clubId: string;
    clubSlug: string;
    productId: string;
    image: { bytes: Uint8Array; contentType: string };
  }) => {
    const product = await requireProduct(deps, input.clubId, input.productId);
    // Checked before uploading so a full product leaves no orphan file behind.
    if (product.imageKeys.length >= MAX_PRODUCT_PHOTOS) {
      throw new TooManyPhotosError(input.productId);
    }
    const key = await deps.images.save(input.clubSlug, input.image);
    // The repository re-checks atomically: two uploads at once can't pass the limit.
    const added = await deps.products.appendImageKey(input.productId, key, MAX_PRODUCT_PHOTOS);
    if (!added) throw new TooManyPhotosError(input.productId);
  };
}

export function makeRemoveProductPhoto(deps: Deps) {
  return async (input: { clubId: string; productId: string; key: string }) => {
    await requireProduct(deps, input.clubId, input.productId);
    await deps.products.removeImageKey(input.productId, input.key);
  };
}
