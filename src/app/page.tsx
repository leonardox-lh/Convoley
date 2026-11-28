import { ChevronRight, type LucideIcon, Package, Ticket, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { VolleyballIcon } from "@/components/volleyball";
import { heroBackground } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findFirstClubSlugForMember } from "@/modules/clubs";
import { currentUserId } from "@/modules/identity";
import {
  CardSkeletons,
  ClubsSection,
  HomeSection,
  SiteHeader,
  UpcomingEventsSection,
} from "./home-sections";

const HOME_CLUBS_LIMIT = 6;
const HOME_EVENTS_LIMIT = 7;

type ProfileLink = { href: string; title: string; text: string; icon: LucideIcon };

/** Home for everyone: the clubs on Convoley, the next events of all of them and your profile. */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:gap-12">
        {/* data-club-hero: on phones the color runs up under the see-through top bar (globals.css). */}
        <section
          data-club-hero
          className="relative -mx-4 -mt-8 overflow-hidden rounded-b-[2rem] px-6 pt-17 pb-8 text-white shadow-lg sm:mx-0 sm:mt-0 sm:rounded-3xl sm:pt-10"
          style={heroBackground(null)}
        >
          <VolleyballIcon className="pointer-events-none absolute -right-12 -bottom-10 size-48 opacity-15" />
          <div className="relative flex max-w-xl flex-col gap-3">
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
              Encuentra tu próximo partido de vóley
            </h1>
            <p className="text-white/80">Reserva tu cupo, paga y juega.</p>
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
              <Suspense fallback={<ClubCta href="/registro" label="Crea tu club gratis" />}>
                <CreateOrOpenClubCta />
              </Suspense>
            </div>
          </div>
        </section>

        <ClubsSection title="Clubes" limit={HOME_CLUBS_LIMIT} />

        <UpcomingEventsSection title="Próximas convocatorias" limit={HOME_EVENTS_LIMIT} />

        <HomeSection id="perfil" title="Mi perfil">
          <Suspense fallback={<CardSkeletons className="grid gap-3 sm:grid-cols-2" />}>
            <ProfileLinks />
          </Suspense>
        </HomeSection>
      </main>
    </div>
  );
}

/** Members of a club go straight to its panel; everyone else is invited to create one. */
async function CreateOrOpenClubCta() {
  const userId = await currentUserId();
  const clubSlug = userId ? await findFirstClubSlugForMember(userId) : null;
  return clubSlug ? (
    <ClubCta href={`/admin/${clubSlug}`} label="Ver mi club" />
  ) : (
    <ClubCta href="/registro" label="Crea tu club gratis" />
  );
}

function ClubCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "h-11 border-2 border-primary-foreground bg-transparent px-4 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
      )}
    >
      {label}
    </Link>
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
    href: "/mis-pedidos",
    title: "Mis pedidos",
    text: "Lo que compraste en la tienda y lo que falta pagar.",
    icon: Package,
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
