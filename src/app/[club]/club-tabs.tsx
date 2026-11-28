"use client";

import { CalendarDays, LayoutGrid, ShoppingBag, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Folder tabs whose active one joins the panel below. Phones have no panel box, so a line under
 * the tabs stands in for its top edge and the active tab opens into the content.
 */
export function ClubTabs({
  slug,
  admin = false,
}: {
  slug: string;
  /** The club panel's tabs. */ admin?: boolean;
}) {
  const pathname = usePathname();
  // The tapped tab lights up at once, before the new section finishes loading.
  const [tapped, setTapped] = useState<{ from: string; href: string } | null>(null);
  const activeHref = tapped && tapped.from === pathname ? tapped.href : pathname;
  const base = admin ? `/admin/${slug}` : `/${slug}`;
  const tabs = [
    admin
      ? { href: base, label: "Mi club", icon: LayoutGrid }
      : { href: base, label: "Convocatorias", icon: CalendarDays },
    { href: `${base}/tienda`, label: "Tienda", icon: ShoppingBag },
    { href: `${base}/planes`, label: "Planes", icon: Ticket },
  ];

  return (
    <nav
      aria-label="Secciones del club"
      className="relative z-[1] -mb-px flex gap-1 max-sm:mb-0 max-sm:border-b"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = activeHref === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => href !== pathname && setTapped({ from: pathname, href })}
            className={cn(
              "flex items-center gap-1.5 rounded-t-2xl border border-b-0 px-3.5 py-2.5 text-sm font-medium transition-colors max-sm:flex-1 max-sm:justify-center max-sm:px-2",
              active
                ? "border-border bg-card text-primary max-sm:-mb-px max-sm:bg-background"
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
