"use client";

import { CalendarDays, ShoppingBag, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Folder tabs: the active one joins the panel below it. */
export function ClubTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  // The tapped tab lights up at once, before the new section finishes loading.
  const [tapped, setTapped] = useState<{ from: string; href: string } | null>(null);
  const activeHref = tapped && tapped.from === pathname ? tapped.href : pathname;
  const tabs = [
    { href: `/${slug}`, label: "Convocatorias", icon: CalendarDays },
    { href: `/${slug}/tienda`, label: "Tienda", icon: ShoppingBag },
    { href: `/${slug}/planes`, label: "Planes", icon: Ticket },
  ];

  return (
    <nav aria-label="Secciones del club" className="relative z-[1] -mb-px flex gap-1">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = activeHref === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => href !== pathname && setTapped({ from: pathname, href })}
            className={cn(
              "flex items-center gap-1.5 rounded-t-2xl border border-b-0 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-border bg-card text-primary"
                : "border-transparent bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
