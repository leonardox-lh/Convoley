import { ImageResponse } from "next/og";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import { buildRoster, listEventRegistrations } from "@/modules/registrations";
import { requireOrganizer } from "../../../require-organizer";
import { loadImageBrand } from "./image-assets";
import { LIST_IMAGE_FORMATS, listImageLayout, type ListImageFormat } from "./image-layout";
import { ListImage } from "./list-image";

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
  const brand = event && (await loadImageBrand(clubSlug, event));
  if (!event || !brand) return new Response(null, { status: 404 });

  const format = formatSchema.parse(new URL(request.url).searchParams.get("formato"));
  const roster = buildRoster(await listEventRegistrations({ eventId: event.id }));
  const rows = roster.players.length + (roster.waitlist.length ? roster.waitlist.length + 1 : 0);
  const layout = listImageLayout(format, rows);

  const image = new ImageResponse(<ListImage {...brand} roster={roster} layout={layout} />, {
    width: layout.width,
    height: layout.height,
  });
  // The list changes with every sign-up: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
