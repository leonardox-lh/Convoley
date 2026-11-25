import { formatInLima } from "@/lib/lima-time";
import { getClubProfile, readClubLogo } from "@/modules/clubs";
import type { ImageBrand } from "./image-header";

const DEFAULT_PRIMARY = "#1d4ed8";
const DEFAULT_SECONDARY = "#facc15";
// Satori (next/og) draws PNG and JPEG; a WebP logo is left out instead of failing.
const DRAWABLE_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);

async function logoDataUrl(key: string): Promise<string | null> {
  const logo = await readClubLogo(key);
  if (!logo || !DRAWABLE_LOGO_TYPES.has(logo.contentType)) return null;
  const base64 = Buffer.from(await new Response(logo.body).arrayBuffer()).toString("base64");
  return `data:${logo.contentType};base64,${base64}`;
}

/** The club's colors, logo and the event's title and date, as both images draw them. */
export async function loadImageBrand(
  clubSlug: string,
  event: { title: string; startsAt: Date },
): Promise<ImageBrand | null> {
  const club = await getClubProfile(clubSlug);
  if (!club) return null;
  const when = formatInLima(event.startsAt);
  return {
    clubName: club.name,
    title: event.title,
    when: when.charAt(0).toUpperCase() + when.slice(1),
    primary: club.primaryColor ?? DEFAULT_PRIMARY,
    secondary: club.secondaryColor ?? DEFAULT_SECONDARY,
    logo: club.logoKey ? await logoDataUrl(club.logoKey) : null,
  };
}
