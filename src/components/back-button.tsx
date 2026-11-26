"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { parentPath } from "@/lib/parent-path";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

// Module state lives as long as the tab does without a reload: true once the player moved
// inside the app, so "back" can use the browser history instead of jumping to a parent.
let movedInsideApp = false;
let firstPath: string | null = null;

/** Round "←" button: browser back inside the app, otherwise the screen one level up. */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  // Read on click, not with usePathname(): that hook makes every layout using this button
  // a blocking route in Next 16.
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={() =>
        movedInsideApp ? router.back() : router.push(parentPath(window.location.pathname))
      }
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-current/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </button>
  );
}

/**
 * Top bar with back + logo for screens without a header of their own. Screens that already
 * have one mark it with data-has-back, which hides this bar (globals.css). Mounted in the root
 * layout, so it also records whether the player navigated inside the app.
 */
export function AppBar() {
  const pathname = usePathname();
  useEffect(() => {
    firstPath ??= pathname;
    if (pathname !== firstPath) movedInsideApp = true;
  }, [pathname]);

  if (pathname === "/") return null;
  return (
    <header data-app-bar className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center gap-1 px-2 py-2">
        <BackButton />
        <Link href="/" aria-label="Convoley, inicio">
          <Logo />
        </Link>
      </div>
    </header>
  );
}
