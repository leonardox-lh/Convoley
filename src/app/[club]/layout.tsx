import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { VolleyballIcon } from "@/components/volleyball";
import { heroBackground } from "../event-hero";
import { clubLogoPath, getClubProfile } from "@/modules/clubs";
import { ClubDescription } from "./club-description";
import { ClubTabs } from "./club-tabs";

const LOGO_PX = 96;

/** Public club pages: the club's header, then folder tabs whose panel holds each page. */
export default function PublicClubLayout({ children, params }: LayoutProps<"/[club]">) {
  return (
    <div className="flex flex-1 flex-col">
      <header data-site-header data-has-back className="border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-1 px-2 py-3">
          <BackButton />
          <Link href="/" aria-label="Convoley, inicio">
            <Logo />
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        <Suspense fallback={<div className="mb-5 h-44 animate-pulse rounded-3xl bg-secondary" />}>
          <ClubHeader params={params} />
        </Suspense>
        <Suspense>
          <ClubTabsFor params={params} />
        </Suspense>
        {/* Phones: the section runs edge to edge with no card around it; wider screens keep the folder. */}
        <div className="flex-1 max-sm:-mx-4 sm:rounded-2xl sm:rounded-tl-none sm:border sm:bg-card sm:shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

async function ClubTabsFor({ params }: Pick<LayoutProps<"/[club]">, "params">) {
  return <ClubTabs slug={(await params).club} />;
}

async function ClubHeader({ params }: Pick<LayoutProps<"/[club]">, "params">) {
  const club = await getClubProfile((await params).club);
  if (!club) notFound();
  const links = [
    club.whatsappUrl && {
      href: club.whatsappUrl,
      label: "Comunidad",
      className: "bg-[#25d366] text-white hover:bg-[#1fbe5b]",
      icon: <BrandIcon path={WHATSAPP_PATH} />,
    },
    club.contactPhone && {
      href: `https://wa.me/${club.contactPhone.replace("+", "")}`,
      label: "Organizador",
      className: "bg-white text-primary hover:bg-white/90",
      icon: <MessageCircle className="size-4" aria-hidden />,
    },
    club.instagramUrl && {
      href: club.instagramUrl,
      label: "Instagram",
      className:
        "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white hover:opacity-90",
      icon: <BrandIcon path={INSTAGRAM_PATH} />,
    },
    club.tiktokUrl && {
      href: club.tiktokUrl,
      label: "TikTok",
      className: "bg-black text-white hover:bg-black/80",
      icon: <BrandIcon path={TIKTOK_PATH} />,
    },
  ].filter((link) => !!link);

  return (
    <section
      data-club-hero
      className="relative -mx-4 -mt-6 mb-5 flex flex-col gap-4 overflow-hidden rounded-b-[2rem] px-5 pt-20 pb-6 text-white shadow-lg sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-5"
      style={heroBackground(club.primaryColor)}
    >
      <VolleyballIcon className="pointer-events-none absolute -bottom-12 -left-12 size-44 opacity-15" />
      <div className="relative flex items-start gap-4">
        <div className="flex min-h-24 min-w-0 flex-1 flex-col gap-1">
          <p
            className="text-xs font-semibold tracking-wide uppercase"
            style={{ color: club.secondaryColor ?? undefined }}
          >
            Club de vóley
          </p>
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight first-letter:uppercase">
            {club.name}
          </h1>
          {club.description && <ClubDescription clubName={club.name} text={club.description} />}
        </div>
        {club.logoKey ? (
          <Image
            src={clubLogoPath(club.logoKey)}
            alt={`Logo de ${club.name}`}
            width={LOGO_PX}
            height={LOGO_PX}
            unoptimized
            className="size-24 shrink-0 rounded-2xl bg-white object-cover shadow-md ring-4 ring-white/30"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl font-semibold ring-4 ring-white/20"
          >
            {club.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {links.length > 0 && (
        // One row whatever the count; with three or more only the icons fit on a phone.
        <div className="relative flex gap-2">
          {links.map((link) => (
            <LinkButton key={link.label} {...link} iconOnly={links.length > 2} />
          ))}
        </div>
      )}
    </section>
  );
}

const TIKTOK_PATH =
  "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1 0-5.2c.27 0 .53.04.78.12V9.66a5.7 5.7 0 0 0-.78-.05 5.69 5.69 0 1 0 5.68 5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48Z";
const INSTAGRAM_PATH =
  "M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.08a3.18 3.18 0 1 1 0-6.36 3.18 3.18 0 0 1 0 6.36Zm5.1-9.4a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z";
const WHATSAPP_PATH =
  "M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.2-1.37A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.81.83-3.01-.2-.31a8.22 8.22 0 1 1 6.94 3.84Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.28Z";

function BrandIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d={path} />
    </svg>
  );
}

function LinkButton({
  href,
  label,
  className,
  icon,
  iconOnly,
}: {
  href: string;
  label: string;
  className: string;
  icon: React.ReactNode;
  iconOnly: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={iconOnly ? label : undefined}
      title={label}
      className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 [&_svg]:size-5 ${className}`}
    >
      {icon}
      {!iconOnly && <span className="truncate">{label}</span>}
    </a>
  );
}
