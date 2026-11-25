import { ImageResponse } from "next/og";
import { appUrl } from "@/lib/app-url";
import { formatSoles } from "@/lib/money";
import { getOrganizerEvent } from "@/modules/events";
import { seatSummary } from "@/modules/registrations";
import { requireOrganizer } from "../../../require-organizer";
import { loadImageBrand } from "../imagen/image-assets";
import { FlyerImage } from "./flyer-image";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/** HU-37: PNG flyer (9:16) with date, venue, price and the spots left right now. */
export async function GET(
  _request: Request,
  context: RouteContext<"/admin/[club]/convocatorias/[event]/flyer">,
) {
  const { club: clubSlug, event: eventId } = await context.params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) {
    return new Response(null, { status: 404 });
  }
  const event = await getOrganizerEvent({ clubSlug, eventId });
  const brand = event && (await loadImageBrand(clubSlug, event));
  if (!event || !brand) return new Response(null, { status: 404 });

  const { free } = seatSummary(event.capacity, event.confirmedCount);
  const spots =
    free === 0
      ? "Lista llena · únete a la espera"
      : `Quedan ${free} ${free === 1 ? "cupo" : "cupos"}`;
  const link = `${await appUrl()}${event.sharePath}`.replace(/^https?:\/\//, "");

  const image = new ImageResponse(
    <FlyerImage
      {...brand}
      venue={event.venueName}
      price={event.priceCents === 0 ? "Gratis" : formatSoles(event.priceCents)}
      spots={spots}
      link={link}
    />,
    { width: STORY_WIDTH, height: STORY_HEIGHT },
  );
  // Spots change with every sign-up: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
