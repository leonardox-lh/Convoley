// Renders the shareable images (list, flyer, game-day table) of the demo club straight from their
// components, without the dev server. Run: npx tsx scripts/promo-images.tsx [outputDir]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const CLUB = "club-mania";
const OUT = process.argv[2] ?? "D:/convoley-promo/public/shots";

async function main() {
  // Imported after dotenv so env parsing sees DATABASE_URL and the bucket variables.
  const { ImageResponse } = await import("next/og");
  const { db } = await import("@/lib/db");
  const { formatTimeInLima, formatWeekdayDateInLima } = await import("@/lib/lima-time");
  const { formatSoles } = await import("@/lib/money");
  const { getOrganizerEvent } = await import("@/modules/events");
  const { buildRoster, getGameDay, listEventRegistrations, seatSummary } =
    await import("@/modules/registrations");
  const base = "@/app/admin/[club]/convocatorias/[event]";
  const { loadImageBrand } = await import(`${base}/imagen/image-assets`);
  const { loadImageFonts } = await import(`${base}/imagen/image-fonts`);
  const { LIST_IMAGE_FORMATS, listImageLayout } = await import(`${base}/imagen/image-layout`);
  const { ListImage } = await import(`${base}/imagen/list-image`);
  const { FlyerImage } = await import(`${base}/flyer/flyer-image`);
  const { ScheduleImage, scheduleImageLayout } = await import(
    `${base}/partidos/imagen/game-day-image`
  );

  const idOf = async (title: string) =>
    (
      await db.event.findFirstOrThrow({
        where: { club: { slug: CLUB }, title, status: { not: "closed" } },
      })
    ).id;
  const fonts = await loadImageFonts();
  const save = async (name: string, image: Response) => {
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(await image.arrayBuffer()));
    console.info("✓", name);
  };

  const mixed = (await getOrganizerEvent({
    clubSlug: CLUB,
    eventId: await idOf("Mixto intermedio"),
  }))!;
  const brand = (await loadImageBrand(CLUB, mixed))!;
  const roster = buildRoster(await listEventRegistrations({ eventId: mixed.id }));
  const rows =
    Math.max(roster.players.length, mixed.capacity) +
    (roster.waitlist.length ? roster.waitlist.length + 1 : 0);
  const layout = listImageLayout("historia", rows);
  await save(
    "image-list-story",
    new ImageResponse(
      <ListImage {...brand} roster={roster} capacity={mixed.capacity} layout={layout} />,
      { fonts, width: layout.width, height: layout.height },
    ),
  );

  const { free } = seatSummary(mixed.capacity, mixed.confirmedCount);
  const size = { width: 1080, height: 1920 };
  await save(
    "image-flyer-story",
    new ImageResponse(
      <FlyerImage
        {...size}
        title={mixed.title}
        date={formatWeekdayDateInLima(mixed.startsAt)}
        time={`${formatTimeInLima(mixed.startsAt)} – ${formatTimeInLima(mixed.endsAt!)}`}
        venue={mixed.venueName}
        price={formatSoles(mixed.priceCents)}
        spots={
          free === 0
            ? "Lista llena · únete a la espera"
            : `¡Quedan ${free} ${free === 1 ? "cupo" : "cupos"}!`
        }
        primary={brand.primary}
        secondary={brand.secondary}
        clubName={brand.clubName}
        logo={brand.logo}
      />,
      { ...size, fonts },
    ),
  );

  const live = (await getOrganizerEvent({ clubSlug: CLUB, eventId: await idOf("Competitivo") }))!;
  const liveBrand = (await loadImageBrand(CLUB, live))!;
  const gameDay = await getGameDay(live.id);
  const schedule = scheduleImageLayout(gameDay, liveBrand, LIST_IMAGE_FORMATS.historia.height);
  await save(
    "image-matches-story",
    new ImageResponse(<ScheduleImage {...liveBrand} gameDay={gameDay} row={schedule.row} />, {
      width: LIST_IMAGE_FORMATS.historia.width,
      height: schedule.height,
      fonts,
    }),
  );
  await db.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
