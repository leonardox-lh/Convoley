import sharp from "sharp";
import { formatEventTimeInLima } from "@/lib/lima-time";
import { getClubProfile, readClubLogo } from "@/modules/clubs";
import type { ImageBrand } from "./image-header";

const DEFAULT_PRIMARY = "#1d4ed8";
const DEFAULT_SECONDARY = "#facc15";
// Satori (next/og) only draws PNG and JPEG: anything else (older WebP logos) becomes PNG.
const DRAWABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

export interface StoredImage {
  src: string;
  width: number;
  height: number;
}

/** A stored club image (logo, champion photo) as a data URL Satori can draw, with its size. */
export async function storedImage(key: string): Promise<StoredImage | null> {
  const stored = await readClubLogo(key);
  if (!stored) return null;
  const bytes = Buffer.from(await new Response(stored.body).arrayBuffer());
  try {
    const { width, height } = await sharp(bytes).metadata();
    if (DRAWABLE_IMAGE_TYPES.has(stored.contentType)) {
      return {
        src: `data:${stored.contentType};base64,${bytes.toString("base64")}`,
        width,
        height,
      };
    }
    const png = await sharp(bytes).png().toBuffer();
    return { src: `data:image/png;base64,${png.toString("base64")}`, width, height };
  } catch {
    return null; // An unreadable image is left out, never drawn broken.
  }
}

/** The club's colors, logo and the event's title and date, as both images draw them. */
export async function loadImageBrand(
  clubSlug: string,
  event: { title: string; startsAt: Date; endsAt?: Date | null },
): Promise<ImageBrand | null> {
  const club = await getClubProfile(clubSlug);
  if (!club) return null;
  const when = formatEventTimeInLima(event);
  return {
    clubName: club.name,
    title: event.title,
    when: when.charAt(0).toUpperCase() + when.slice(1),
    primary: DEFAULT_PRIMARY,
    secondary: DEFAULT_SECONDARY,
    logo: club.logoKey ? ((await storedImage(club.logoKey))?.src ?? null) : null,
  };
}
