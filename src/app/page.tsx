import {
  CalendarDays,
  LayoutGrid,
  ChevronRight,
  type LucideIcon,
  MapPin,
  Ticket,
  Trophy,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { VolleyballIcon } from "@/components/volleyball";
import { heroBackground } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { formatTimeRangeInLima } from "@/lib/lima-time";
import { formatSoles } from "@/lib/money";
import {
  clubLogoPath,
  findClubNamesByIds,
  findFirstClubSlugForMember,
  listAllClubs,
} from "@/modules/clubs";
import { listUpcomingEvents } from "@/modules/events";
import { currentUserId } from "@/modules/identity";

const UPCOMING_EVENTS_LIMIT = 8;
const CLUB_LOGO_PX = 56;
const SECTIONS: [string, string, LucideIcon][] = [
  ["clubes", "Clubes", Trophy],
  ["convocatorias", "Convocatorias", CalendarDays],
  ["perfil", "Mi perfil", UserRound],
];

const LIMA = "America/Lima";
const limaDay = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, day: "numeric" });
const limaMonth = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, month: "short" });
const limaWeekday = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long" });

type ProfileLink = { href: string; title: string; text: string; icon: LucideIcon };

/** Home for everyone: the clubs on Convoley, the next events of all of them and your profile. */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header
        data-site-header
        className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Convoley, inicio">
            <Logo />
          </Link>
          <nav aria-label="Secciones" className="flex gap-1">
            {SECTIONS.map(([id, label, Icon]) => (
              <a
                key={id}
                href={`#${id}`}
                data-header-pill
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                <Icon className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">{label}</span>
              </a>
            ))}
            <Suspense>
              <MyClubLink />
            </Suspense>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-8">
        {/* data-club-hero: on phones the color runs up under the see-through top bar (globals.css). */}
        <section
          data-club-hero
          className="relative -mx-4 -mt-8 overflow-hidden rounded-b-[2rem] px-6 pt-14 pb-8 text-white shadow-lg sm:mx-0 sm:mt-0 sm:rounded-3xl sm:pt-10"
          style={heroBackground(null)}
        >
          <VolleyballIcon className="pointer-events-none absolute -top-10 -right-12 size-48 opacity-15" />
          <div className="relative flex max-w-xl flex-col gap-3">
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
              Encuentra tu próximo partido de vóley
            </h1>
            <p className="text-white/80">
              Separa tu cupo para las próximas convocatorias, realiza tus pagos desde tu celular y
              llega a la cancha con tu cupo asegurado.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="#convocatorias"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                  className: "h-11 px-4",
                })}
              >
                Ver convocatorias
              </a>
              <Link
                href="/registro"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className:
                    "h-11 border-primary-foreground/40 bg-transparent px-4 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                })}
              >
                Crea tu club gratis
              </Link>
            </div>
          </div>
        </section>

        <HomeSection id="clubes" title="Clubes" subtitle="Elige un club y mira sus convocatorias.">
          <Suspense
            fallback={<CardSkeletons className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" />}
          >
            <ClubGrid />
          </Suspense>
        </HomeSection>

        <HomeSection
          id="convocatorias"
          title="Próximas convocatorias"
          subtitle="Los próximos partidos de todos los clubes."
        >
          <Suspense fallback={<CardSkeletons className="grid gap-3 md:grid-cols-2" />}>
            <UpcomingEvents />
          </Suspense>
        </HomeSection>

        <HomeSection id="perfil" title="Mi perfil">
          <Suspense fallback={<CardSkeletons className="grid gap-3 sm:grid-cols-2" />}>
            <ProfileLinks />
          </Suspense>
        </HomeSection>
      </main>
    </div>
  );
}

/** Shown only to members of a club (admin or organizer): straight to its panel. */
async function MyClubLink() {
  const userId = await currentUserId();
  const clubSlug = userId ? await findFirstClubSlugForMember(userId) : null;
  if (!clubSlug) return null;
  return (
    <Link
      href={`/admin/${clubSlug}`}
      data-header-pill
      className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
    >
      <LayoutGrid className="size-4" aria-hidden />
      <span className="sr-only sm:not-sr-only">Mi club</span>
    </Link>
  );
}

function HomeSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-20 flex-col gap-4">
      <div>
        <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function CardSkeletons({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden>
      {[0, 1, 2].map((key) => (
        <div key={key} className="h-24 animate-pulse rounded-2xl bg-secondary" />
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

async function ClubGrid() {
  const clubs = await listAllClubs();
  if (clubs.length === 0) return <EmptyState>Todavía no hay clubes. ¡Crea el primero!</EmptyState>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {clubs.map((club) => (
        <li key={club.id}>
          <Link
            href={`/${club.slug}`}
            className="card-interactive group flex items-center gap-3 p-4"
          >
            {club.logoKey ? (
              <Image
                src={clubLogoPath(club.logoKey)}
                alt=""
                width={CLUB_LOGO_PX}
                height={CLUB_LOGO_PX}
                unoptimized
                className="size-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
              >
                {club.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{club.name}</span>
              <span className="line-clamp-2 text-sm text-muted-foreground">
                {club.description ?? `convoley.pe/${club.slug}`}
              </span>
            </span>
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function UpcomingEvents() {
  await connection(); // "upcoming" depends on the request time, never on build time.
  const events = await listUpcomingEvents(UPCOMING_EVENTS_LIMIT);
  if (events.length === 0) {
    return <EmptyState>No hay convocatorias abiertas por ahora. Vuelve pronto.</EmptyState>;
  }
  const clubs = new Map(
    (await findClubNamesByIds([...new Set(events.map((e) => e.clubId))])).map((c) => [c.id, c]),
  );

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {events.map((event) => {
        const club = clubs.get(event.clubId);
        if (!club) return null;
        const isFull = event.remainingSpots === 0;
        return (
          <li key={event.id} className="min-w-0">
            <Link href={`/c/${club.slug}/${event.id}`} className="card-interactive flex gap-4 p-4">
              <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary py-2 text-secondary-foreground">
                <span className="text-2xl leading-none font-semibold">
                  {limaDay.format(event.startsAt)}
                </span>
                <span className="text-xs font-medium uppercase">
                  {limaMonth.format(event.startsAt).replace(".", "")}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{event.title}</span>
                  <span
                    className={
                      isFull
                        ? "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                    }
                  >
                    {isFull ? "Llena" : `${event.remainingSpots} cupos`}
                  </span>
                </span>
                <span className="text-sm font-medium text-primary">{club.name}</span>
                <span className="text-sm text-muted-foreground first-letter:uppercase">
                  {limaWeekday.format(event.startsAt)} · {formatTimeRangeInLima(event)}
                </span>
                <span className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{event.venueName}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatSoles(event.priceCents)}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const SIGNED_IN_LINKS: ProfileLink[] = [
  { href: "/perfil", title: "Mis datos", text: "Tu nombre y tu celular.", icon: UserRound },
  {
    href: "/mis-inscripciones",
    title: "Mis inscripciones",
    text: "Tus partidos y el estado de tus pagos.",
    icon: Ticket,
  },
  {
    href: "/admin",
    title: "Panel de mi club",
    text: "Convocatorias, cobros y jugadores.",
    icon: Trophy,
  },
];
const SIGNED_OUT_LINKS: ProfileLink[] = [
  {
    href: "/mis-inscripciones",
    title: "Soy jugador",
    text: "Ingresa con Google y mira tus inscripciones.",
    icon: Ticket,
  },
  {
    href: "/ingresar",
    title: "Soy organizador",
    text: "Ingresa al panel de tu club.",
    icon: Trophy,
  },
];

async function ProfileLinks() {
  const links = (await currentUserId()) ? SIGNED_IN_LINKS : SIGNED_OUT_LINKS;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {links.map(({ href, title, text, icon: Icon }) => (
        <li key={href}>
          <Link href={href} className="card-interactive group flex items-center gap-4 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </span>
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Chevron() {
  return (
    <ChevronRight
      className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      aria-hidden
    />
  );
}
