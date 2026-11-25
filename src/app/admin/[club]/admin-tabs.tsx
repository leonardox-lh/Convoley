"use client";

import { type LucideIcon, Plus, ShoppingBag, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// The club's main jobs, one tap away from any admin page.
const TABS: [path: string, label: string, Icon: LucideIcon][] = [
  ["convocatorias/nueva", "Nueva convocatoria", Plus],
  ["tienda", "Tienda", ShoppingBag],
  ["pagos", "Cobros", Wallet],
  ["planes", "Planes", Ticket],
];

/** Quick tabs under the admin header; they scroll sideways when the phone is too narrow. */
export function AdminTabs({ clubSlug }: { clubSlug: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // On a narrow phone the active tab may sit past the edge: bring it into view.
  useEffect(() => {
    navRef.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav
      ref={navRef}
      data-admin-tabs
      aria-label="Accesos rápidos del club"
      className="mx-auto flex w-full max-w-md gap-1.5 overflow-x-auto px-4 pb-2.5 sm:max-w-3xl sm:justify-center [scrollbar-width:none]"
    >
      {TABS.map(([path, label, Icon]) => {
        const href = `/admin/${clubSlug}/${path}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={path}
            href={href}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-primary/15",
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
