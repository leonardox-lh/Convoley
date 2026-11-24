// Test data for local development and the integration test. Run with `npx prisma db seed`.
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { scryptPasswordHasher } from "../src/modules/identity/infrastructure/scrypt-password-hasher";

// Does not override an already-set DATABASE_URL (the integration test passes its own).
config({ path: ".env.local", quiet: true });

const SEED_CLUB_SLUG = "voley-miraflores";
// Test-only password of organizer@convoley.test (local data and e2e). Never a real one.
export const SEED_ORGANIZER_PASSWORD = "convoley-dev-1234";
const EVENT_PRICE_CENTS = 1500;
const EVENT_CAPACITY = 18;
const POLO_PRICE_CENTS = 4500;
const KNEE_PADS_PRICE_CENTS = 6000;

async function seed(db: PrismaClient) {
  // Idempotent: a second run must not duplicate anything.
  if (await db.club.findUnique({ where: { slug: SEED_CLUB_SLUG } })) {
    console.info(`Seed skipped: club "${SEED_CLUB_SLUG}" already exists.`);
    return;
  }

  await db.$transaction(async (tx) => {
    const organizer = await tx.user.create({
      data: {
        name: "Ana Organizadora",
        email: "organizer@convoley.test",
        passwordHash: await scryptPasswordHasher.hash(SEED_ORGANIZER_PASSWORD),
      },
    });
    const googlePlayer = await tx.user.create({
      data: {
        name: "Luis Jugador",
        email: "player@convoley.test",
        phone: "+51987654321",
        accounts: {
          create: {
            type: "oidc",
            provider: "google",
            providerAccountId: "seed-google-player",
          },
        },
      },
    });

    const club = await tx.club.create({
      data: {
        slug: SEED_CLUB_SLUG,
        name: "Vóley Miraflores",
        description: "Club de prueba para desarrollo local.",
        primaryColor: "#1D4ED8",
        instagramUrl: "https://instagram.com/voleymiraflores",
        members: { create: { userId: organizer.id, role: "admin" } },
        communities: { create: { name: "General" } },
      },
      include: { communities: true },
    });

    const event = await tx.event.create({
      data: {
        clubId: club.id,
        communityId: club.communities[0].id,
        title: "Mixto intermedio",
        // Lima is UTC-05:00 all year (no DST), so a fixed offset is exact.
        startsAt: new Date("2026-12-05T19:00:00-05:00"),
        venueName: "Coliseo Manuel Bonilla",
        mapsUrl: "https://maps.google.com/?q=Coliseo+Manuel+Bonilla",
        priceCents: EVENT_PRICE_CENTS,
        capacity: EVENT_CAPACITY,
        isMixed: true,
        status: "published",
      },
    });

    await tx.registration.create({
      data: {
        eventId: event.id,
        firstName: "María",
        lastName: "Quispe",
        phone: "+51911111111",
      },
    });
    await tx.registration.create({
      data: {
        eventId: event.id,
        firstName: "Jorge",
        lastName: "Ramírez",
        phone: "+51922222222",
        status: "paid",
        payments: {
          create: {
            clubId: club.id,
            amountCents: EVENT_PRICE_CENTS,
            method: "voucher",
            status: "approved",
            proofFileKey: "vouchers/seed/voucher-1.jpg",
            reviewedAt: new Date(),
            reviewedByUserId: organizer.id,
          },
        },
      },
    });
    await tx.registration.create({
      data: {
        eventId: event.id,
        userId: googlePlayer.id,
        firstName: "Luis",
        lastName: "Jugador",
        phone: "+51987654321",
        status: "paid",
        payments: {
          create: {
            clubId: club.id,
            amountCents: EVENT_PRICE_CENTS,
            method: "mercado_pago",
            status: "approved",
            providerPaymentId: "seed-1",
          },
        },
      },
    });

    const polo = await tx.product.create({
      data: {
        clubId: club.id,
        name: "Polo oficial",
        priceCents: POLO_PRICE_CENTS,
        variants: {
          create: [
            { size: "S", stock: 5 },
            { size: "M", stock: 8 },
            { size: "L", stock: 4 },
          ],
        },
      },
      include: { variants: true },
    });
    await tx.product.create({
      data: {
        clubId: club.id,
        name: "Rodilleras",
        priceCents: KNEE_PADS_PRICE_CENTS,
        variants: { create: { size: null, stock: 10 } },
      },
    });

    await tx.order.create({
      data: {
        clubId: club.id,
        userId: googlePlayer.id,
        firstName: "Luis",
        lastName: "Jugador",
        phone: "+51987654321",
        pickupEventId: event.id,
        totalCents: POLO_PRICE_CENTS,
        items: {
          create: { variantId: polo.variants[1].id, quantity: 1, unitPriceCents: POLO_PRICE_CENTS },
        },
      },
    });
  });

  console.info(`Seed done: club "${SEED_CLUB_SLUG}" created.`);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await seed(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
