import { ImageResponse } from "next/og";
import { z } from "zod";
import { formatInLima } from "@/lib/lima-time";
import { getClubProfile, readClubLogo } from "@/modules/clubs";
import { getOrganizerEvent } from "@/modules/events";
import { buildRoster, listEventRegistrations } from "@/modules/registrations";
import { requireOrganizer } from "../../../require-organizer";
import { LIST_IMAGE_FORMATS, listImageLayout, type ListImageFormat } from "./image-layout";
import { ListImage } from "./list-image";

const DEFAULT_PRIMARY = "#1d4ed8";
const DEFAULT_SECONDARY = "#facc15";
// Satori (next/og) draws PNG and JPEG; a WebP logo is left out instead of failing.
const DRAWABLE_LOGO_TYPES = new Set(["image/png", "image/jpeg"]);

const formatSchema = z
  .enum(Object.keys(LIST_IMAGE_FORMATS) as [ListImageFormat, ...ListImageFormat[]])
  .catch("cuadrado");

/** PNG of the event list in the club's colors and logo, to share on WhatsApp/Instagram (HU-16). */
export async function GET(
  request: Request,
  context: RouteContext<"/admin/[club]/convocatorias/[event]/imagen">,
) {
  const { club: clubSlug, event: eventId } = await context.params;
  if (!(await requireOrganizer(clubSlug, "run_game_day")))
    return new Response(null, { status: 404 });
  const event = await getOrganizerEvent({ clubSlug, eventId });
  const club = await getClubProfile(clubSlug);
  if (!event || !club) return new Response(null, { status: 404 });

  const format = formatSchema.parse(new URL(request.url).searchParams.get("formato"));
  const roster = buildRoster(await listEventRegistrations({ eventId: event.id }));
  const rows = roster.players.length + (roster.waitlist.length ? roster.waitlist.length + 1 : 0);
  const layout = listImageLayout(format, rows);
  const when = formatInLima(event.startsAt);

  const image = new ImageResponse(
    <ListImage
      clubName={club.name}
      title={event.title}
      when={when.charAt(0).toUpperCase() + when.slice(1)}
      primary={club.primaryColor ?? DEFAULT_PRIMARY}
      secondary={club.secondaryColor ?? DEFAULT_SECONDARY}
      logo={club.logoKey ? await logoDataUrl(club.logoKey) : null}
      roster={roster}
      layout={layout}
    />,
    { width: layout.width, height: layout.height },
  );
  // The list changes with every sign-up: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}

async function logoDataUrl(key: string): Promise<string | null> {
  const logo = await readClubLogo(key);
  if (!logo || !DRAWABLE_LOGO_TYPES.has(logo.contentType)) return null;
  const base64 = Buffer.from(await new Response(logo.body).arrayBuffer()).toString("base64");
  return `data:${logo.contentType};base64,${base64}`;
}
