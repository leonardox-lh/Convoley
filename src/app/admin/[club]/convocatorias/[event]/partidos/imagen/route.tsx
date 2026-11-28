import { ImageResponse } from "next/og";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import { getGameDay, listEventTeams } from "@/modules/registrations";
import { requireOrganizer } from "../../../../require-organizer";
import { loadImageBrand, storedImage } from "../../imagen/image-assets";
import { LIST_IMAGE_FORMATS, type ListImageFormat } from "../../imagen/image-layout";
import {
  ChampionImage,
  championImageLayout,
  ScheduleImage,
  scheduleImageLayout,
} from "./game-day-image";
import { loadImageFonts } from "../../imagen/image-fonts";

const querySchema = z.object({
  formato: z
    .enum(Object.keys(LIST_IMAGE_FORMATS) as [ListImageFormat, ...ListImageFormat[]])
    .catch("historia"),
  tipo: z.enum(["programacion", "campeon"]).catch("programacion"),
});

/** Game day: PNG of the schedule (table and matches) or of the champion, like the list image. */
export async function GET(
  request: Request,
  context: RouteContext<"/admin/[club]/convocatorias/[event]/partidos/imagen">,
) {
  const { club: clubSlug, event: eventId } = await context.params;
  if (!(await requireOrganizer(clubSlug, "run_game_day"))) {
    return new Response(null, { status: 404 });
  }
  const event = await getOrganizerEvent({ clubSlug, eventId });
  const brand = event && (await loadImageBrand(clubSlug, event));
  if (!event || !brand) return new Response(null, { status: 404 });

  const params = new URL(request.url).searchParams;
  const { formato, tipo } = querySchema.parse({
    formato: params.get("formato"),
    tipo: params.get("tipo"),
  });
  const gameDay = await getGameDay(event.id);
  if (tipo === "campeon" && !gameDay.champion) return new Response(null, { status: 404 });

  const photo =
    tipo === "campeon" && gameDay.championPhotoKey
      ? await storedImage(gameDay.championPhotoKey)
      : null;
  // With the team's photo the banner shows the photo instead of the player names.
  const championTeam =
    gameDay.champion &&
    !photo &&
    (await listEventTeams(event.id)).teams.find((team) => team.number === gameDay.champion?.number);
  const players = (championTeam ? championTeam.players : []).map(
    (player) => `${player.firstName} ${player.lastName.charAt(0)}.`,
  );
  // The format is the most the image grows: it ends right after its content.
  const { width, height: maxHeight } = LIST_IMAGE_FORMATS[formato];
  const schedule = scheduleImageLayout(gameDay, brand, maxHeight);
  const champion = championImageLayout({ gameDay, brand, players, photo, maxHeight });
  const image = new ImageResponse(
    tipo === "campeon" ? (
      <ChampionImage
        {...brand}
        gameDay={gameDay}
        players={players}
        photo={photo}
        photoSize={champion.photoSize}
      />
    ) : (
      <ScheduleImage {...brand} gameDay={gameDay} row={schedule.row} />
    ),
    {
      width,
      height: tipo === "campeon" ? champion.height : schedule.height,
      fonts: await loadImageFonts(),
    },
  );
  // Scores change during the game: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
