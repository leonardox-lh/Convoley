"use client";

import {
  BadgeCheck,
  CalendarPlus,
  ChartColumn,
  type LucideIcon,
  Package,
  Pencil,
  Repeat,
  ScanLine,
  ShoppingBag,
  Store,
  Swords,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HERO_TILE_CLASS, HERO_TITLE_CLASS } from "./panel-hero";

// Path after /admin/<club>. Mi club, Tienda and Planes show the stats instead.
const SECTIONS: [RegExp, LucideIcon, string][] = [
  [/^\/recurrentes$/, Repeat, "Convocatorias recurrentes"],
  [/^\/perfil$/, Store, "Perfil del club"],
  [/^\/pagos$/, Wallet, "Cobros por Yape o Plin"],
  [/^\/finanzas$/, ChartColumn, "Finanzas"],
  [/^\/organizadores$/, UserCog, "Organizadores"],
  [/^\/comunidades$/, Users, "Comunidades"],
  [/^\/pedidos$/, Package, "Pedidos"],
  [/^\/suscripcion$/, BadgeCheck, "Suscripción a Convoley"],
  [/^\/convocatorias\/nueva$/, CalendarPlus, "Nueva convocatoria"],
  [/^\/convocatorias\/[^/]+\/editar$/, Pencil, "Editar convocatoria"],
  [/^\/convocatorias\/[^/]+\/equipos$/, Users, "Equipos"],
  [/^\/convocatorias\/[^/]+\/partidos$/, Swords, "Partidos"],
  [/^\/convocatorias\/[^/]+\/asistencia\/[^/]+$/, ScanLine, "Asistencia"],
  [/^\/tienda\/[^/]+$/, ShoppingBag, "Editar producto"],
];

// The event page has a hero of its own (date, venue, spots).
const OWN_HERO = /^\/convocatorias\/(?!nueva$)[^/]+$/;

/** The path after /admin/<club>. */
function useSectionPath() {
  return usePathname().replace(/^\/admin\/[^/]+/, "");
}

/** The shared hero lives in the layout; it hides only on pages that bring their own. */
export function PanelHeroGate({ children }: { children: React.ReactNode }) {
  return OWN_HERO.test(useSectionPath()) ? null : children;
}

/**
 * The left side of the shared hero. It is the only part that changes between pages: the hero
 * itself stays put while the page below loads.
 */
export function PanelHeroBody({ stats }: { stats: React.ReactNode }) {
  const path = useSectionPath();
  const section = SECTIONS.find(([pattern]) => pattern.test(path));
  if (!section) {
    return (
      <>
        <h1 className={HERO_TITLE_CLASS}>Panel del club</h1>
        {stats}
      </>
    );
  }
  const [, Icon, label] = section;
  return (
    <>
      <p className={HERO_TITLE_CLASS}>Panel del club</p>
      <div className={cn(HERO_TILE_CLASS, "items-center gap-2")}>
        <Icon className="size-5 shrink-0" aria-hidden />
        <h1 className="line-clamp-2 text-sm leading-[1.1rem] font-bold">{label}</h1>
      </div>
    </>
  );
}
