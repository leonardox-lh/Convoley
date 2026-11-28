// Demo club for marketing screenshots (promo video). Local database only: `npm run seed:demo`.
// Re-running wipes and recreates the demo club, so dates stay relative to "now".
import { createHash, randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import sharp from "sharp";
import {
  PrismaClient,
  type PlayerGender,
  type PlayerLevel,
  type PlayerPosition,
} from "../src/generated/prisma/client";
import { limaDateTimeToUtc, todayInLima } from "../src/lib/lima-time";
import { defaultLevelRows } from "../src/modules/clubs/domain/community";
import { scryptPasswordHasher } from "../src/modules/identity/infrastructure/scrypt-password-hasher";

config({ path: ".env.local", quiet: true });

const DEMO_SLUG = "club-mania";
const DEMO_EMAIL_DOMAIN = "@demo.convoley.test";
// Test-only password for the demo organizer (local screenshots). Never a real one.
const DEMO_PASSWORD = "convoley-demo-1234";
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const BRAND = "#1F4FD1";
const BALL = "#F2A32C";
// DEMO_PROMO=1 is the promo video's take: no past weeks (finance in the hundreds) and the
// game day's final played, with a team photo for the champion image.
const PROMO = process.env.DEMO_PROMO === "1";
const PAST_WEEKS = PROMO ? 0 : 12;

type Player = {
  firstName: string;
  lastName: string;
  gender: PlayerGender;
  position: PlayerPosition;
  level: PlayerLevel;
};

const P = (
  firstName: string,
  lastName: string,
  gender: PlayerGender,
  position: PlayerPosition,
  level: PlayerLevel,
): Player => ({ firstName, lastName, gender, position, level });

const PLAYERS: Player[] = [
  P("Diego", "Salazar", "male", "setter", "advanced"),
  P("Valeria", "Ríos", "female", "outside_hitter", "advanced"),
  P("Renzo", "Paz", "male", "middle_blocker", "intermediate"),
  P("Lucía", "Mendoza", "female", "libero", "intermediate"),
  P("Kevin", "Huamán", "male", "opposite", "advanced"),
  P("Camila", "Torres", "female", "setter", "intermediate"),
  P("Sebastián", "Vargas", "male", "outside_hitter", "intermediate"),
  P("Fernanda", "Castillo", "female", "middle_blocker", "advanced"),
  P("Joaquín", "Rojas", "male", "libero", "beginner"),
  P("Daniela", "Flores", "female", "opposite", "intermediate"),
  P("Mateo", "Chávez", "male", "middle_blocker", "advanced"),
  P("Mariana", "Gutiérrez", "female", "outside_hitter", "beginner"),
  P("Gonzalo", "Ramos", "male", "setter", "intermediate"),
  P("Ximena", "Cárdenas", "female", "libero", "advanced"),
  P("Rodrigo", "Espinoza", "male", "outside_hitter", "advanced"),
  P("Alessandra", "Vega", "female", "setter", "intermediate"),
  P("Piero", "Medina", "male", "any", "beginner"),
  P("Brenda", "Soto", "female", "middle_blocker", "intermediate"),
  P("Álvaro", "Núñez", "male", "opposite", "intermediate"),
  P("Nicole", "Paredes", "female", "outside_hitter", "advanced"),
  P("Franco", "Herrera", "male", "libero", "intermediate"),
  P("Andrea", "Quispe", "female", "opposite", "intermediate"),
  P("Luis", "Aguilar", "male", "middle_blocker", "beginner"),
  P("Gabriela", "Morales", "female", "any", "beginner"),
  P("Bruno", "Salas", "male", "setter", "advanced"),
  P("Antonella", "Ruiz", "female", "libero", "intermediate"),
  P("Javier", "Cueva", "male", "outside_hitter", "intermediate"),
  P("Sofía", "Benavides", "female", "middle_blocker", "advanced"),
  P("Iván", "Delgado", "male", "any", "intermediate"),
  P("Carla", "Zegarra", "female", "outside_hitter", "intermediate"),
  P("Óscar", "Lozano", "male", "opposite", "advanced"),
  P("Milagros", "Tapia", "female", "setter", "beginner"),
  P("Adrián", "Villanueva", "male", "middle_blocker", "intermediate"),
  P("Patricia", "León", "female", "opposite", "intermediate"),
  P("Hugo", "Palacios", "male", "outside_hitter", "beginner"),
  P("Rocío", "Campos", "female", "libero", "advanced"),
  P("Marco", "Ortiz", "male", "setter", "intermediate"),
  P("Karla", "Arias", "female", "any", "intermediate"),
  P("Eduardo", "Pinto", "male", "libero", "advanced"),
  P("Paola", "Reyes", "female", "middle_blocker", "beginner"),
];

const phoneOf = (index: number) => `+5199${String(1000000 + index * 7919).slice(-7)}`;

// Deterministic "random" so every run produces the same numbers.
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

// ─── images ────────────────────────────────────────────────────────────────

const svgToPng = (svg: string, size = 800) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

// Stand-in team photo for the champion image: six players in the club's jersey and the cup.
function teamPhotoSvg() {
  const player = (x: number, number: number, raised: boolean) => {
    const arms = raised
      ? `<path d="M${x - 34} 470 L${x - 70} 360 M${x + 34} 470 L${x + 70} 360" stroke="#c98d63" stroke-width="22" stroke-linecap="round"/>`
      : `<path d="M${x - 36} 470 L${x - 52} 580 M${x + 36} 470 L${x + 52} 580" stroke="#c98d63" stroke-width="22" stroke-linecap="round"/>`;
    return `<g>${arms}<rect x="${x - 26}" y="600" width="22" height="150" rx="10" fill="#0a1a4a"/><rect x="${x + 4}" y="600" width="22" height="150" rx="10" fill="#0a1a4a"/><rect x="${x - 48}" y="450" width="96" height="170" rx="30" fill="${BRAND}"/><text x="${x}" y="555" font-family="Arial" font-weight="700" font-size="56" fill="#fff" text-anchor="middle">${number}</text><circle cx="${x}" cy="405" r="40" fill="#c98d63"/><path d="M${x - 40} 400 a40 40 0 0 1 80 0 q-40 -22 -80 0z" fill="#2b1d14"/></g>`;
  };
  const players = [150, 330, 510, 690, 870, 1050].map((x, i) =>
    player(x, [7, 3, 11, 5, 9, 1][i], i % 2 === 0),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25407f"/><stop offset="1" stop-color="#0d1838"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect y="640" width="1200" height="160" fill="#c58b4e"/><path d="M0 700 H1200" stroke="#fff" stroke-width="6" opacity=".6"/><g opacity=".25" fill="#fff"><circle cx="200" cy="120" r="70"/><circle cx="600" cy="90" r="90"/><circle cx="1000" cy="130" r="70"/></g>${players.join("")}<g transform="translate(600 610)"><path d="M-55 -120 h110 v40 a55 55 0 0 1 -110 0z" fill="${BALL}"/><rect x="-12" y="-28" width="24" height="40" fill="${BALL}"/><rect x="-40" y="10" width="80" height="22" rx="4" fill="#7a4d10"/></g></svg>`;
}

// A club crest (shield + monogram), so it reads as a club and not as Convoley's own ball.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#fff"/>
  <path d="M100 12L172 34V94C172 142 140 172 100 190C60 172 28 142 28 94V34Z" fill="#0F1F5C" stroke="${BALL}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M28 70H172V92H28Z" fill="#C8102E"/>
  <polygon points="100,30 105,44 120,44 108,53 112,67 100,58 88,67 92,53 80,44 95,44" fill="${BALL}"/>
  <text x="100" y="138" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="58" text-anchor="middle" fill="#fff">CM</text>
  <text x="100" y="164" font-family="Arial, sans-serif" font-weight="700" font-size="15" letter-spacing="3" text-anchor="middle" fill="${BALL}">VÓLEY</text>
</svg>`;

const productSvg = (bg: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>${body}</svg>`;

const PRODUCT_IMAGES = {
  polo: productSvg(
    "#E8EEFB",
    `<path d="M70 40l-38 22 14 30 18-8v80h72V84l18 8 14-30-38-22c-6 12-18 18-30 18s-24-6-30-18z" fill="${BRAND}"/>
     <path d="M70 40c6 12 18 18 30 18s24-6 30-18" stroke="${BALL}" stroke-width="6" fill="none"/>
     <circle cx="100" cy="112" r="16" fill="#fff"/><path d="M100 96c-6 8-6 22 0 32M86 108c10 0 20 4 28 12" stroke="${BALL}" stroke-width="3" fill="none"/>`,
  ),
  kneePads: productSvg(
    "#FFF3DE",
    `<rect x="40" y="50" width="52" height="100" rx="22" fill="#141A2E"/><rect x="108" y="50" width="52" height="100" rx="22" fill="#141A2E"/>
     <ellipse cx="66" cy="100" rx="18" ry="24" fill="#2B3354"/><ellipse cx="134" cy="100" rx="18" ry="24" fill="#2B3354"/>
     <rect x="40" y="58" width="52" height="6" fill="${BALL}"/><rect x="108" y="58" width="52" height="6" fill="${BALL}"/>`,
  ),
  bottle: productSvg(
    "#E3F4EA",
    `<rect x="84" y="28" width="32" height="18" rx="4" fill="#141A2E"/><rect x="70" y="44" width="60" height="128" rx="18" fill="${BRAND}"/>
     <rect x="70" y="92" width="60" height="30" fill="#fff"/><circle cx="100" cy="107" r="10" fill="${BALL}"/>`,
  ),
  cap: productSvg(
    "#F1ECFA",
    `<path d="M48 120c0-40 24-66 52-66s52 26 52 66z" fill="#141A2E"/><path d="M40 120h120c10 0 10 14 0 14H70c-20 0-30-6-30-14z" fill="${BRAND}"/>
     <circle cx="100" cy="94" r="14" fill="#fff"/><path d="M100 80c-5 8-5 20 0 28M88 92c8 0 16 3 24 10" stroke="${BALL}" stroke-width="3" fill="none"/>`,
  ),
};

// A generic payment confirmation, deliberately not a copy of any wallet's real screen.
const VOUCHER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640">
  <rect width="360" height="640" fill="#5B1D7A"/>
  <rect x="24" y="120" width="312" height="380" rx="20" fill="#fff"/>
  <circle cx="180" cy="190" r="34" fill="#22A06B"/><path d="M164 190l11 11 22-24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
  <text x="180" y="262" font-family="Arial" font-size="22" font-weight="700" text-anchor="middle" fill="#5B1D7A">Pago enviado</text>
  <text x="180" y="318" font-family="Arial" font-size="44" font-weight="700" text-anchor="middle" fill="#141A2E">S/ 15</text>
  <text x="180" y="368" font-family="Arial" font-size="17" text-anchor="middle" fill="#555">Carlos Ramírez</text>
  <text x="180" y="400" font-family="Arial" font-size="15" text-anchor="middle" fill="#888">Código de operación 04821937</text>
</svg>`;

// Two-tone pattern standing in for the club's payment QR (not scannable, demo only).
function qrSvg() {
  const random = rng(7);
  const cells: string[] = [];
  for (let y = 0; y < 25; y++)
    for (let x = 0; x < 25; x++) {
      const finder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
      if (!finder && random() > 0.5)
        cells.push(`<rect x="${x * 8}" y="${y * 8}" width="8" height="8"/>`);
    }
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="56" height="56" fill="#000"/><rect x="${x + 8}" y="${y + 8}" width="40" height="40" fill="#fff"/><rect x="${x + 16}" y="${y + 16}" width="24" height="24" fill="#000"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 232 232"><rect x="-16" y="-16" width="232" height="232" fill="#fff"/><g fill="#000">${cells.join("")}</g>${finder(0, 0)}${finder(144, 0)}${finder(0, 144)}</svg>`;
}

async function uploadImages() {
  const {
    BUCKET_NAME,
    BUCKET_ENDPOINT,
    BUCKET_REGION,
    BUCKET_ACCESS_KEY_ID,
    BUCKET_SECRET_ACCESS_KEY,
  } = process.env;
  if (!BUCKET_NAME || !BUCKET_ENDPOINT || !BUCKET_ACCESS_KEY_ID || !BUCKET_SECRET_ACCESS_KEY) {
    throw new Error("Bucket is not configured: set the BUCKET_* variables (see .env.example).");
  }
  const s3 = new S3Client({
    endpoint: BUCKET_ENDPOINT,
    region: BUCKET_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: BUCKET_ACCESS_KEY_ID, secretAccessKey: BUCKET_SECRET_ACCESS_KEY },
  });
  const put = async (key: string, body: Buffer) =>
    s3.send(
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: body, ContentType: "image/png" }),
    );

  // Same prefixes as the app's storage adapters: logos/ (public images) and vouchers/ (private).
  const keys = {
    logo: `${DEMO_SLUG}-logo.png`,
    qr: `${DEMO_SLUG}-qr.png`,
    // Voucher keys must look like the app's own: a UUID plus extension.
    voucher: "0d3c1a2e-5b7f-4c9a-9e1d-6f2b8a4c3e7d.png",
    products: {} as Record<keyof typeof PRODUCT_IMAGES, string>,
  };
  await put(`logos/${keys.logo}`, await svgToPng(LOGO_SVG, 512));
  await put(`logos/${keys.qr}`, await svgToPng(qrSvg(), 600));
  await put(
    `vouchers/${keys.voucher}`,
    await sharp(Buffer.from(VOUCHER_SVG)).resize(720, 1280).png().toBuffer(),
  );
  if (PROMO) {
    await put(
      `logos/${DEMO_SLUG}-champion.png`,
      await sharp(Buffer.from(teamPhotoSvg())).resize(1200, 800).png().toBuffer(),
    );
  }
  for (const [name, svg] of Object.entries(PRODUCT_IMAGES)) {
    // Image keys only allow lowercase letters, digits and dashes.
    const key = `${DEMO_SLUG}-product-${name.toLowerCase()}.png`;
    await put(`logos/${key}`, await svgToPng(svg));
    keys.products[name as keyof typeof PRODUCT_IMAGES] = key;
  }
  return keys;
}

// ─── wipe ──────────────────────────────────────────────────────────────────

async function wipe(db: PrismaClient) {
  const club = await db.club.findUnique({ where: { slug: DEMO_SLUG } });
  if (club) {
    const where = { clubId: club.id };
    await db.$transaction([
      db.payment.deleteMany({ where }),
      db.creditUse.deleteMany({ where: { planPurchase: where } }),
      db.balanceUse.deleteMany({ where: { playerBalance: where } }),
      db.order.deleteMany({ where }),
      db.registration.deleteMany({ where: { event: where } }),
      db.event.deleteMany({ where }),
      db.recurringEvent.deleteMany({ where }),
      db.planPurchase.deleteMany({ where }),
      db.plan.deleteMany({ where }),
      db.product.deleteMany({ where }),
      db.playerBalance.deleteMany({ where }),
      db.subscriptionPayment.deleteMany({ where }),
      db.subscription.deleteMany({ where }),
      db.club.delete({ where: { id: club.id } }),
    ]);
  }
  await db.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });
}

// ─── seed ──────────────────────────────────────────────────────────────────

async function seed(db: PrismaClient) {
  const images = await uploadImages();
  const now = new Date();
  const random = rng(42);
  const limaDay = (offsetDays: number) =>
    todayInLima(new Date(now.getTime() + offsetDays * DAY_MS));
  const weekdayOf = (date: string) => new Date(`${date}T12:00:00-05:00`).getUTCDay();

  const passwordHash = await scryptPasswordHasher.hash(DEMO_PASSWORD);
  const organizer = await db.user.create({
    data: {
      name: "Carlos Ramírez",
      firstName: "Carlos",
      lastName: "Ramírez",
      email: `carlos${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
    },
  });
  const helper = await db.user.create({
    data: {
      name: "Mafer Torres",
      firstName: "Mafer",
      lastName: "Torres",
      email: `mafer${DEMO_EMAIL_DOMAIN}`,
      passwordHash,
    },
  });

  const club = await db.club.create({
    data: {
      slug: DEMO_SLUG,
      name: "Club Manía",
      description:
        "Pichangas de vóley en Miraflores y Barranco. Todos los niveles, buena onda y mucho juego.",
      logoKey: images.logo,
      primaryColor: BRAND,
      secondaryColor: BALL,
      instagramUrl: "https://instagram.com/clubmania.voley",
      tiktokUrl: "https://tiktok.com/@clubmania.voley",
      whatsappUrl: "https://chat.whatsapp.com/demo",
      contactPhone: "+51987123456",
      paymentApp: "yape",
      paymentPhone: "+51987123456",
      paymentHolderName: "Carlos Ramírez",
      paymentQrKey: images.qr,
      cancellationDeadlineHours: 24,
      members: {
        create: [
          { userId: organizer.id, role: "admin" },
          { userId: helper.id, role: "helper" },
        ],
      },
      invitations: {
        create: {
          role: "helper",
          tokenHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
          expiresAt: new Date(now.getTime() + 5 * DAY_MS),
          createdByUserId: organizer.id,
        },
      },
      communities: { create: defaultLevelRows(now) },
      subscription: {
        create: {
          trialEndsAt: new Date(now.getTime() - 10 * DAY_MS),
          paidUntil: new Date(now.getTime() + 40 * DAY_MS),
        },
      },
    },
    include: { communities: { orderBy: { createdAt: "asc" } } },
  });
  const [general, , intermediate, competitive] = club.communities;

  const venue = {
    bonilla: {
      venueName: "Coliseo Manuel Bonilla",
      mapsUrl: "https://maps.google.com/?q=Coliseo+Manuel+Bonilla+Miraflores",
    },
    barranco: {
      venueName: "Polideportivo de Barranco",
      mapsUrl: "https://maps.google.com/?q=Polideportivo+Barranco",
    },
  };

  // Weekly templates linked to the upcoming dates, so lazy publishing doesn't duplicate them.
  const mixedDate = limaDay(2);
  const generalDate = limaDay(4);
  const mixedTemplate = await db.recurringEvent.create({
    data: {
      clubId: club.id,
      communityId: intermediate.id,
      title: "Mixto intermedio",
      weekday: weekdayOf(mixedDate),
      startMinute: 20 * 60,
      endMinute: 22 * 60,
      ...venue.bonilla,
      priceCents: 1500,
      capacity: 16,
      category: "mixed" as const,
      showRoster: true,
      publishDaysBefore: 3,
      rules: "Mínimo 2 chicas por equipo. Llega 10 minutos antes para calentar.",
    },
  });
  const generalTemplate = await db.recurringEvent.create({
    data: {
      clubId: club.id,
      communityId: general.id,
      title: "General · todos los niveles",
      weekday: weekdayOf(generalDate),
      startMinute: 10 * 60,
      endMinute: 12 * 60,
      ...venue.barranco,
      priceCents: 1200,
      capacity: 24,
      category: "mixed" as const,
      showRoster: true,
      publishDaysBefore: 5,
    },
  });

  let registrationCount = 0;
  type Reg = {
    player: Player;
    playerIndex: number;
    status: "paid" | "in_review" | "pending_payment" | "waitlisted";
    teamNumber?: number;
    checkedIn?: boolean;
    method?: "voucher" | "manual";
  };
  async function addRegistrations(
    eventId: string,
    priceCents: number,
    startsAt: Date,
    regs: Reg[],
  ) {
    for (const [order, reg] of regs.entries()) {
      // Sign-ups trickle in over the days before the event, oldest first.
      const createdAt = new Date(startsAt.getTime() - (3 * DAY_MS - order * 37 * MINUTE_MS));
      const paid = reg.status === "paid";
      await db.registration.create({
        data: {
          eventId,
          firstName: reg.player.firstName,
          lastName: reg.player.lastName,
          phone: phoneOf(reg.playerIndex),
          position: reg.player.position,
          level: reg.player.level,
          gender: reg.player.gender,
          status: reg.status,
          teamNumber: reg.teamNumber ?? null,
          checkedInAt: reg.checkedIn
            ? new Date(startsAt.getTime() - 10 * MINUTE_MS + order * MINUTE_MS)
            : null,
          createdAt,
          ...((paid || reg.status === "in_review") && {
            payments: {
              create: {
                clubId: club.id,
                amountCents: priceCents,
                method: reg.method ?? "voucher",
                status: paid ? "approved" : "in_review",
                proofFileKey: reg.method === "manual" ? null : images.voucher,
                reviewedAt: paid ? new Date(createdAt.getTime() + 20 * MINUTE_MS) : null,
                reviewedByUserId: paid ? (order % 3 === 0 ? helper.id : organizer.id) : null,
                createdAt: new Date(createdAt.getTime() + 2 * MINUTE_MS),
              },
            },
          }),
        },
      });
      registrationCount++;
    }
  }
  const pick = (count: number, offset: number): { player: Player; playerIndex: number }[] =>
    Array.from({ length: count }, (_, i) => {
      const playerIndex = (offset + i) % PLAYERS.length;
      return { player: PLAYERS[playerIndex], playerIndex };
    });

  // 1. Upcoming mixed event, almost full: the star of the player screenshots.
  const mixedStart = limaDateTimeToUtc(mixedDate, "20:00");
  const mixed = await db.event.create({
    data: {
      clubId: club.id,
      communityId: intermediate.id,
      title: "Mixto intermedio",
      startsAt: mixedStart,
      endsAt: limaDateTimeToUtc(mixedDate, "22:00"),
      ...venue.bonilla,
      priceCents: 1500,
      capacity: 16,
      category: "mixed" as const,
      showRoster: true,
      status: "published",
      rules: mixedTemplate.rules,
      recurringEventId: mixedTemplate.id,
      recurringSlot: mixedStart,
      courtCostCents: 12000,
    },
  });
  // Andrea Quispe (index 21) is the in-review voucher of the payment scene.
  const mixedPlayers = pick(14, 0).filter((p) => p.playerIndex !== 21);
  await addRegistrations(mixed.id, 1500, mixedStart, [
    ...mixedPlayers.slice(0, 12).map((p, i) => ({
      ...p,
      status: "paid" as const,
      method: i === 5 ? ("manual" as const) : undefined,
    })),
    { player: PLAYERS[21], playerIndex: 21, status: "in_review" },
    { ...mixedPlayers[12], status: "in_review" },
    { ...(mixedPlayers[13] ?? pick(1, 30)[0]), status: "pending_payment" },
  ]);

  // 2. Saturday general event, half full.
  const generalStart = limaDateTimeToUtc(generalDate, "10:00");
  const generalEvent = await db.event.create({
    data: {
      clubId: club.id,
      communityId: general.id,
      title: "General · todos los niveles",
      startsAt: generalStart,
      endsAt: limaDateTimeToUtc(generalDate, "12:00"),
      ...venue.barranco,
      priceCents: 1200,
      capacity: 24,
      category: "mixed" as const,
      showRoster: true,
      status: "published",
      recurringEventId: generalTemplate.id,
      recurringSlot: generalStart,
      courtCostCents: 15000,
    },
  });
  await addRegistrations(
    generalEvent.id,
    1200,
    generalStart,
    pick(14, 22).map((p, i) => ({
      ...p,
      status: i < 11 ? ("paid" as const) : ("pending_payment" as const),
    })),
  );

  // 3. Game day happening right now: check-in, 3 teams and matches with scores.
  const liveStart = new Date(
    Math.floor((now.getTime() - 40 * MINUTE_MS) / (15 * MINUTE_MS)) * 15 * MINUTE_MS,
  );
  const live = await db.event.create({
    data: {
      clubId: club.id,
      communityId: competitive.id,
      title: "Competitivo",
      startsAt: liveStart,
      endsAt: new Date(liveStart.getTime() + 2 * 60 * MINUTE_MS),
      ...venue.bonilla,
      priceCents: 2000,
      capacity: 18,
      category: "mixed" as const,
      showRoster: true,
      status: "full",
      courtCostCents: 14000,
      teamNames: {
        create: [
          { teamNumber: 1, name: "Los Bloqueadores" },
          { teamNumber: 2, name: "Saque Fuerte" },
          { teamNumber: 3, name: "La Malla" },
        ],
      },
      teamMatches: {
        create: [
          { position: 1, homeTeam: 1, awayTeam: 2, homeScore: 25, awayScore: 21 },
          { position: 2, homeTeam: 1, awayTeam: 3, homeScore: 23, awayScore: 25 },
          { position: 3, homeTeam: 2, awayTeam: 3, homeScore: 25, awayScore: 19 },
          PROMO
            ? {
                ...{ position: 4, homeTeam: 1, awayTeam: 2, isFinal: true },
                ...{ homeScore: 25, awayScore: 22, championPhotoKey: `${DEMO_SLUG}-champion.png` },
              }
            : { position: 4, homeTeam: 1, awayTeam: 2, isFinal: true },
        ],
      },
    },
  });
  // Teams balanced by hand: 2 women each at least, mixed levels.
  await addRegistrations(
    live.id,
    2000,
    liveStart,
    pick(18, 0).map((p, i) => ({
      ...p,
      status: "paid" as const,
      teamNumber: (i % 3) + 1,
      checkedIn: i !== 7 && i !== 16,
    })),
  );
  // The live event is full, so a few wait for a seat (the mixed one keeps "1 cupo libre").
  await addRegistrations(
    live.id,
    2000,
    liveStart,
    pick(3, 33).map((p) => ({ ...p, status: "waitlisted" as const })),
  );

  // 4. Past dates for the finance panel: two a week for PAST_WEEKS weeks.
  for (let week = 1; week <= PAST_WEEKS; week++) {
    for (const [template, date, time, price, capacity, cost] of [
      [mixedTemplate, limaDay(2 - week * 7), "20:00", 1500, 16, 12000],
      [generalTemplate, limaDay(4 - week * 7), "10:00", 1200, 24, 15000],
    ] as const) {
      const startsAt = limaDateTimeToUtc(date, time);
      const event = await db.event.create({
        data: {
          clubId: club.id,
          communityId: template.communityId,
          title: template.title,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 2 * 60 * MINUTE_MS),
          venueName: template.venueName,
          mapsUrl: template.mapsUrl,
          priceCents: price,
          capacity,
          category: "mixed" as const,
          showRoster: true,
          status: "closed",
          recurringEventId: template.id,
          recurringSlot: startsAt,
          courtCostCents: cost,
        },
      });
      // Older weeks a bit emptier: the club has been growing.
      const filled = Math.min(
        capacity,
        Math.round(capacity * (0.62 + (PAST_WEEKS - week) * 0.03 + random() * 0.12)),
      );
      await addRegistrations(
        event.id,
        price,
        startsAt,
        pick(filled, week * 5).map((p, i) => ({
          ...p,
          status: "paid" as const,
          checkedIn: i % 9 !== 4,
        })),
      );
    }
  }

  // ─── store and plans ─────────────────────────────────────────────────────
  const product = (
    name: string,
    description: string,
    priceCents: number,
    image: string,
    sizes: (string | null)[],
  ) =>
    db.product.create({
      data: {
        clubId: club.id,
        name,
        description,
        priceCents,
        imageKeys: [image],
        variants: { create: sizes.map((size, i) => ({ size, stock: 4 + ((i * 5) % 9) })) },
      },
      include: { variants: true },
    });
  const polo = await product(
    "Polo oficial",
    "Dry-fit, con el logo del club al pecho.",
    4500,
    images.products.polo,
    ["S", "M", "L", "XL"],
  );
  const kneePads = await product(
    "Rodilleras",
    "Acolchadas, par. Talla única.",
    6000,
    images.products.kneePads,
    [null],
  );
  await product(
    "Tomatodo",
    "750 ml, mantiene el agua fría todo el partido.",
    2500,
    images.products.bottle,
    [null],
  );
  await product("Gorra", "Para el vóley playa de verano.", 3500, images.products.cap, [null]);

  const orders = [
    { playerIndex: 3, items: [[polo.variants[1], 1]], status: "paid" },
    {
      playerIndex: 7,
      items: [
        [kneePads.variants[0], 1],
        [polo.variants[0], 1],
      ],
      status: "in_review",
    },
    { playerIndex: 14, items: [[polo.variants[2], 2]], status: "delivered" },
  ] as const;
  for (const order of orders) {
    const player = PLAYERS[order.playerIndex];
    const totalCents = order.items.reduce(
      (sum, [variant, quantity]) =>
        sum + quantity * (variant === kneePads.variants[0] ? 6000 : 4500),
      0,
    );
    await db.order.create({
      data: {
        clubId: club.id,
        firstName: player.firstName,
        lastName: player.lastName,
        phone: phoneOf(order.playerIndex),
        pickupEventId: mixed.id,
        status: order.status,
        totalCents,
        items: {
          create: order.items.map(([variant, quantity]) => ({
            variantId: variant.id,
            quantity,
            unitPriceCents: variant === kneePads.variants[0] ? 6000 : 4500,
          })),
        },
        payments: {
          create: {
            clubId: club.id,
            amountCents: totalCents,
            method: "voucher",
            proofFileKey: images.voucher,
            status: order.status === "in_review" ? "in_review" : "approved",
          },
        },
      },
    });
  }

  const communityIds = club.communities.map((c) => c.id);
  const fourDates = await db.plan.create({
    data: {
      clubId: club.id,
      name: "Paquete 4 fechas",
      priceCents: 5000,
      creditCount: 4,
      validityDays: 30,
      communityIds,
    },
  });
  await db.plan.create({
    data: {
      clubId: club.id,
      name: "Mensualidad ilimitada",
      priceCents: 9000,
      validityDays: 30,
      communityIds,
    },
  });
  await db.plan.create({
    data: {
      clubId: club.id,
      name: "Paquete 8 fechas",
      priceCents: 9500,
      creditCount: 8,
      validityDays: 60,
      communityIds,
    },
  });
  for (const playerIndex of [1, 4, 10]) {
    const player = PLAYERS[playerIndex];
    const paidAt = new Date(now.getTime() - (5 + playerIndex) * DAY_MS);
    await db.planPurchase.create({
      data: {
        clubId: club.id,
        planId: fourDates.id,
        firstName: player.firstName,
        lastName: player.lastName,
        phone: phoneOf(playerIndex),
        status: "active",
        creditsRemaining: 2,
        paidAt,
        expiresAt: new Date(paidAt.getTime() + 30 * DAY_MS),
        payments: {
          create: {
            clubId: club.id,
            amountCents: 5000,
            method: "voucher",
            status: "approved",
            proofFileKey: images.voucher,
          },
        },
      },
    });
  }

  console.info(
    `Demo club "${DEMO_SLUG}" ready: ${registrationCount} sign-ups. Organizer: carlos${DEMO_EMAIL_DOMAIN}`,
  );
}

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Refusing to seed a production database.");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  // Demo data must never reach a hosted database, only the docker-compose one.
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
    throw new Error("Refusing to seed demo data outside a local database.");
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await wipe(db);
    await seed(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
