import { db } from "@/lib/db";
import {
  makeAddProductPhoto,
  makeCreateProduct,
  makeRemoveProductPhoto,
  makeSetProductActive,
  makeUpdateProduct,
} from "./application/products";
import { productImagesAdapter } from "./infrastructure/clubs-adapter";
import {
  listClubProducts,
  prismaProductRepository,
} from "./infrastructure/prisma-product-repository";

const products = prismaProductRepository(db);

// ─── Products (HU-23) ───
export const createProduct = makeCreateProduct({ products });
export const updateProduct = makeUpdateProduct({ products });
export const setProductActive = makeSetProductActive({ products });
export const addProductPhoto = makeAddProductPhoto({ products, images: productImagesAdapter });
export const removeProductPhoto = makeRemoveProductPhoto({ products });
export const findProduct = (clubId: string, productId: string) => products.find(clubId, productId);
export const listProducts = (clubId: string, options: { onlyActive: boolean }) =>
  listClubProducts(db, clubId, options);
export type { StoredProduct as Product } from "./application/ports";
export {
  MAX_PRODUCT_PHOTOS,
  PRODUCT_NAME_MAX_LENGTH,
  SIZE_MAX_LENGTH,
  type VariantInput,
} from "./domain/product";
export {
  InvalidProductError,
  ProductNotFoundError,
  TooManyPhotosError,
  type InvalidProductReason,
} from "./domain/errors";
