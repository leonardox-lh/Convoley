import { ImageResponse } from "next/og";
import { z } from "zod";
import { formatTimeInLima, formatWeekdayDateInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import { getOrganizerEvent } from "@/modules/events";
import { seatSummary } from "@/modules/registrations";
import { requireOrganizer } from "../../../require-organizer";
import { loadImageBrand } from "../imagen/image-assets";
import { FlyerImage } from "./flyer-image";

const FLYER_FORMATS = {
  // 4:5, the tallest the Instagram feed shows whole; also fine on WhatsApp.
  post: { width: 1080, height: 1350 },
  // 9:16 for stories and TikTok (HU-37).
  historia: { width: 1080, height: 1920 },
} as const;

const formatSchema = z.enum(["post", "historia"]).catch("post");

/** HU-37: PNG flyer with date, time, venue, price and the spots left right now. */
export async function GET(
  request: Request,
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
  const isFull = free === 0;
  const spots = isFull
    ? "Lista llena · únete a la espera"
    : `¡Quedan ${free} ${free === 1 ? "cupo" : "cupos"}!`;
  const time = event.endsAt
    ? `${formatTimeInLima(event.startsAt)} – ${formatTimeInLima(event.endsAt)}`
    : formatTimeInLima(event.startsAt);
  const size = FLYER_FORMATS[formatSchema.parse(new URL(request.url).searchParams.get("formato"))];

  const image = new ImageResponse(
    <FlyerImage
      {...size}
      title={event.title}
      date={formatWeekdayDateInLima(event.startsAt)}
      time={time}
      venue={event.venueName}
      price={event.priceCents === 0 ? "Gratis" : formatSoles(event.priceCents)}
      spots={spots}
      callToAction={isFull ? "Reserva tu lugar en espera" : "¡Inscríbete ahora!"}
      primary={brand.primary}
      secondary={brand.secondary}
    />,
    size,
  );
  // Spots change with every sign-up: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
