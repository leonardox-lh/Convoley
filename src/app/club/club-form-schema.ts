import { z } from "zod";
import {
  ClubNotFoundError,
  ClubSlugTakenError,
  InvalidClubSlugError,
  InvalidColorError,
  InvalidLogoTypeError,
  InvalidSocialLinkError,
  LogoTooLargeError,
  ReservedClubSlugError,
} from "@/modules/clubs";

const NAME_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 500;
const LINK_MAX_LENGTH = 200;

/** Empty inputs arrive as "": store them as null. */
const optionalText = (maxLength: number, tooLongMessage: string) =>
  z
    .string()
    .trim()
    .max(maxLength, tooLongMessage)
    .transform((value) => value || null)
    .default(null);

export const clubProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre de tu club.")
    .max(NAME_MAX_LENGTH, `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres.`),
  description: optionalText(
    DESCRIPTION_MAX_LENGTH,
    `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`,
  ),
  primaryColor: optionalText(LINK_MAX_LENGTH, "Elige un color válido."),
  secondaryColor: optionalText(LINK_MAX_LENGTH, "Elige un color válido."),
  instagramUrl: optionalText(LINK_MAX_LENGTH, "El link de Instagram es demasiado largo."),
  tiktokUrl: optionalText(LINK_MAX_LENGTH, "El link de TikTok es demasiado largo."),
});

export const newClubSchema = clubProfileSchema.extend({
  slug: optionalText(LINK_MAX_LENGTH, "El link es demasiado largo."),
});

export const editClubSchema = clubProfileSchema.extend({ clubSlug: z.string().min(1) });

export type ClubFormState = { status: "idle" } | { status: "error"; message: string };

/** The uploaded logo, or null when the file input was left empty. */
export async function logoFromForm(formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return null;
  return { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type };
}

const DOMAIN_ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidClubSlugError, "El link debe tener entre 3 y 40 letras o números."],
  [ReservedClubSlugError, "Ese link está reservado. Prueba con otro."],
  [ClubSlugTakenError, "Ese link ya lo usa otro club. Prueba con otro."],
  [InvalidColorError, "Elige un color válido."],
  [
    InvalidSocialLinkError,
    "Pega el link de tu perfil de Instagram o TikTok (por ejemplo, instagram.com/tuclub).",
  ],
  [LogoTooLargeError, "El logo debe pesar hasta 2 MB."],
  [InvalidLogoTypeError, "El logo debe ser una imagen JPG, PNG o WEBP."],
  [ClubNotFoundError, "No encontramos el club."],
];

/** The message to show for a business rule error, or null if the error is unexpected. */
export function domainErrorMessage(error: unknown): string | null {
  return DOMAIN_ERROR_MESSAGES.find(([type]) => error instanceof type)?.[1] ?? null;
}
