import { ImageResponse } from "next/og";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import { getGameDay, listEventTeams } from "@/modules/registrations";
import { requireOrganizer } from "../../../../require-organizer";
import { loadImageBrand } from "../../imagen/image-assets";
import { LIST_IMAGE_FORMATS, type ListImageFormat } from "../../imagen/image-layout";
import { ChampionImage, StandingsImage } from "./game-day-image";

const querySchema = z.object({
  formato: z
    .enum(Object.keys(LIST_IMAGE_FORMATS) as [ListImageFormat, ...ListImageFormat[]])
    .catch("cuadrado"),
  tipo: z.enum(["tabla", "campeon"]).catch("tabla"),
});

/** Game day: PNG of the table or of the champion, in the same style as the list image. */
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

  const championTeam =
    gameDay.champion &&
    (await listEventTeams(event.id)).teams.find((team) => team.number === gameDay.champion?.number);
  const players = (championTeam?.players ?? []).map(
    (player) => `${player.firstName} ${player.lastName.charAt(0)}.`,
  );
  const size = LIST_IMAGE_FORMATS[formato];
  const image = new ImageResponse(
    tipo === "campeon" ? (
      <ChampionImage {...brand} gameDay={gameDay} players={players} />
    ) : (
      <StandingsImage {...brand} gameDay={gameDay} />
    ),
    size,
  );
  // Scores change during the game: never serve a stale copy.
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
