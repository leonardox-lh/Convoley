"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { solesToCents } from "@/lib/money";
import {
  findClubBySlug,
  InvalidLogoTypeError,
  LogoTooLargeError,
  MAX_LOGO_BYTES,
} from "@/modules/clubs";
import {
  addProductPhoto,
  createProduct,
  InvalidProductError,
  PRODUCT_NAME_MAX_LENGTH,
  ProductNotFoundError,
  removeProductPhoto,
  setProductActive,
  TooManyPhotosError,
  updateProduct,
  type InvalidProductReason,
} from "@/modules/store";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../require-organizer";
import { parseStockInput } from "./stock-input";

export type ProductActionState = { status: "idle" } | { status: "error"; message: string };

const STOCK_FORMAT_MESSAGE = 'Escribe el stock como "10" o por talla: "S:3, M:5, L:0".';

const productSchema = z.object({
  clubSlug: z.string().min(1),
  productId: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre.")
    .max(PRODUCT_NAME_MAX_LENGTH, "Ese nombre es muy largo."),
  description: z.string().trim().max(500, "La descripción es muy larga.").optional(),
  price: z
    .string()
    .transform((raw) => solesToCents(raw))
    .refine((cents) => cents !== null && cents > 0, "Escribe un precio válido, como 45 o 45.50."),
  stock: z
    .string()
    .transform(parseStockInput)
    .refine((variants) => variants !== null, STOCK_FORMAT_MESSAGE),
  // The stock the edit form showed; new products have none.
  loadedStock: z
    .string()
    .optional()
    .transform((raw) => (raw ? (parseStockInput(raw) ?? []) : [])),
});

const PRODUCT_MESSAGES: Record<InvalidProductReason, string> = {
  name: "Escribe un nombre de hasta 80 letras.",
  price: "Escribe un precio mayor que 0.",
  no_variants: STOCK_FORMAT_MESSAGE,
  mixed_sizes: "Usa tallas para todas las variantes o un solo número de stock.",
  size: "Cada talla puede tener hasta 10 letras.",
  duplicate_size: "Hay una talla repetida.",
  stock: "El stock debe ser 0 o más.",
};

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [ProductNotFoundError, "No encontramos ese producto. Recarga la página."],
  [TooManyPhotosError, "Cada producto puede tener hasta 5 fotos."],
  [InvalidLogoTypeError, "Sube una foto JPG, PNG o WebP."],
  [LogoTooLargeError, "Cada foto puede pesar hasta 2 MB."],
];

/** Products shape the club's store, so only its admin manages them. */
async function adminClub(clubSlug: string) {
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) return null;
  return findClubBySlug(clubSlug);
}

function errorState(error: unknown): ProductActionState {
  if (error instanceof InvalidProductError) {
    return { status: "error", message: PRODUCT_MESSAGES[error.reason] };
  }
  const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
  if (known) return { status: "error", message: known[1] };
  throw error;
}

export async function saveProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, productId, name, description, price, stock, loadedStock } = parsed.data;
  const club = await adminClub(clubSlug);
  if (!club) return { status: "error", message: NOT_ALLOWED_MESSAGE };

  const product = { name, description: description || null, priceCents: price!, variants: stock! };
  let id = productId;
  try {
    if (id)
      await updateProduct({ clubId: club.id, productId: id, product, loadedVariants: loadedStock });
    else id = (await createProduct({ clubId: club.id, product })).id;
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/admin/${clubSlug}/tienda`);
  // A new product goes straight to its page to add the photos.
  if (!productId) redirect(`/admin/${clubSlug}/tienda/${id}`);
  return { status: "idle" };
}

const productRefSchema = z.object({ clubSlug: z.string().min(1), productId: z.string().min(1) });

async function runOnProduct(
  formData: FormData,
  work: (input: { clubId: string; clubSlug: string; productId: string }) => Promise<void>,
): Promise<ProductActionState> {
  const parsed = productRefSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos ese producto." };
  const club = await adminClub(parsed.data.clubSlug);
  if (!club) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    await work({ clubId: club.id, clubSlug: club.slug, productId: parsed.data.productId });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/admin/${club.slug}/tienda`);
  revalidatePath(`/admin/${club.slug}/tienda/${parsed.data.productId}`);
  return { status: "idle" };
}

export async function toggleProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const isActive = formData.get("isActive") === "true";
  return runOnProduct(formData, (input) => setProductActive({ ...input, isActive }));
}

export async function addPhotoAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Elige una foto." };
  }
  if (file.size > MAX_LOGO_BYTES)
    return { status: "error", message: "Cada foto puede pesar hasta 2 MB." };
  const image = { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type };
  return runOnProduct(formData, (input) => addProductPhoto({ ...input, image }));
}

export async function removePhotoAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const key = z.string().min(1).safeParse(formData.get("key"));
  if (!key.success) return { status: "error", message: "No encontramos esa foto." };
  return runOnProduct(formData, (input) => removeProductPhoto({ ...input, key: key.data }));
}
