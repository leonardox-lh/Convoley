import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackButton } from "@/components/back-button";
import { Logo } from "@/components/logo";
import { heroBackground } from "@/components/page-heading";
import { clubLogoPath, listAllClubs } from "@/modules/clubs";
import { ProfileButton } from "./profile-button";
import { InfiniteEventList } from "./convocatorias/infinite-event-list";
import { UPCOMING_PAGE_SIZE } from "./convocatorias/page-size";
import { loadUpcomingEventCards } from "./convocatorias/upcoming-event-cards";
import { EVENT_LIST_CLASS, UpcomingEventCard } from "./upcoming-event-card";

const CLUB_LOGO_PX = 80;

/** The site's top bar: the logo, "Mi club" for club members and the profile icon. Inner pages get a back arrow. */
export function SiteHeader({ back = false }: { back?: boolean }) {
  return (
    <header
      data-site-header
      data-has-back={back || undefined}
      className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1">
          {back && <BackButton />}
          <Link href="/" aria-label="Convoley, inicio">
            <Logo />
          </Link>
        </div>
        <Suspense>
          <ProfileButton />
        </Suspense>
      </div>
    </header>
  );
}

export function HomeSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  /** Shown at the right of the title, e.g. "Ver más". */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SeeMoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
    >
      {label}
      <ChevronRight
        className="size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export function CardSkeletons({ className }: { className: string }) {
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

const CLUB_GRID_CLASS = "grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 sm:gap-y-6 lg:grid-cols-4";

/** The clubs on Convoley; with `limit`, only the first ones and a link to all of them. */
export function ClubsSection({ title, limit }: { title: string; limit?: number }) {
  return (
    <Suspense
      fallback={
        <HomeSection id="clubes" title={title}>
          <CardSkeletons className={CLUB_GRID_CLASS} />
        </HomeSection>
      }
    >
      <Clubs title={title} limit={limit} />
    </Suspense>
  );
}

async function Clubs({ title, limit }: { title: string; limit?: number }) {
  const all = await listAllClubs();
  const clubs = limit ? all.slice(0, limit) : all;
  return (
    <HomeSection
      id="clubes"
      title={title}
      action={clubs.length < all.length && <SeeMoreLink href="/clubes" label="Ver más clubes" />}
    >
      {clubs.length === 0 ? (
        <EmptyState>Todavía no hay clubes. ¡Crea el primero!</EmptyState>
      ) : (
        <ul className={CLUB_GRID_CLASS}>
          {clubs.map((club) => (
            <li key={club.id}>
              <Link
                href={`/${club.slug}`}
                className="group flex flex-col items-center gap-1.5 rounded-2xl p-1 text-center"
              >
                <span className="relative">
                  {club.logoKey ? (
                    <Image
                      src={clubLogoPath(club.logoKey)}
                      alt=""
                      width={CLUB_LOGO_PX}
                      height={CLUB_LOGO_PX}
                      unoptimized
                      className="size-20 rounded-full bg-card object-cover shadow-[0_10px_20px_-6px_rgb(0_0_0/0.35),inset_0_-4px_8px_rgb(0_0_0/0.15)] ring-4 ring-white transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-20 items-center justify-center rounded-full text-4xl font-bold text-white shadow-[0_10px_20px_-6px_rgb(0_0_0/0.35),inset_0_-4px_8px_rgb(0_0_0/0.15)] ring-4 ring-white transition-transform duration-300 group-hover:scale-110"
                      style={heroBackground(club.primaryColor)}
                    >
                      {club.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span aria-hidden className="-mt-1 h-2 w-16 rounded-full bg-black/20 blur-[3px]" />
                <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary">
                  {club.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomeSection>
  );
}

/** Upcoming events of every club; with `limit`, only the next ones and a link to all of them. */
export function UpcomingEventsSection({ title, limit }: { title: string; limit?: number }) {
  return (
    <Suspense
      fallback={
        <HomeSection id="convocatorias" title={title}>
          <CardSkeletons className={EVENT_LIST_CLASS} />
        </HomeSection>
      }
    >
      <UpcomingEvents title={title} limit={limit} />
    </Suspense>
  );
}

async function UpcomingEvents({ title, limit }: { title: string; limit?: number }) {
  await connection(); // "upcoming" depends on the request time, never on build time.
  const { cards, hasMore } = await loadUpcomingEventCards(limit ?? UPCOMING_PAGE_SIZE);
  return (
    <HomeSection
      id="convocatorias"
      title={title}
      action={limit && hasMore && <SeeMoreLink href="/convocatorias" label="Ver más" />}
    >
      {cards.length === 0 ? (
        <EmptyState>No hay convocatorias abiertas por ahora. Vuelve pronto.</EmptyState>
      ) : limit ? (
        <ul className={EVENT_LIST_CLASS}>
          {cards.map((card) => (
            <UpcomingEventCard key={card.id} event={card} />
          ))}
        </ul>
      ) : (
        <InfiniteEventList initial={cards} hasMore={hasMore} />
      )}
    </HomeSection>
  );
}
