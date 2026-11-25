import { ImageResponse } from "next/og";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import { listEventTeams } from "@/modules/registrations";
import { requireOrganizer } from "../../../../require-organizer";
import { loadImageBrand } from "../../imagen/image-assets";
import { LIST_IMAGE_FORMATS, type ListImageFormat } from "../../imagen/image-layout";
import { TeamsImage, teamsImageLayout } from "./teams-image";

const formatSchema = z
  .enum(Object.keys(LIST_IMAGE_FORMATS) as [ListImageFormat, ...ListImageFormat[]])
  .catch("cuadrado");

/** HU-32: PNG of the teams, in the same style as the list image, to send to the group. */
export async function GET(
  request: Request,
  context: RouteContext<"/admin/[club]/convocatorias/[event]/equipos/imagen">,
) {
  const { club: clubSlug, event: eventId } = await context.params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) {
    return new Response(null, { status: 404 });
  }
  const event = await getOrganizerEvent({ clubSlug, eventId });
  const brand = event && (await loadImageBrand(clubSlug, event));
  if (!event || !brand) return new Response(null, { status: 404 });

  const format = formatSchema.parse(new URL(request.url).searchParams.get("formato"));
  const { teams } = await listEventTeams(event.id);
  const layout = teamsImageLayout(format, teams);
  const image = new ImageResponse(<TeamsImage {...brand} teams={teams} layout={layout} />, {
    width: layout.width,
    height: layout.height,
  });
  // Teams change with every manual move: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
