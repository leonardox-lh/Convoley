import type { LucideIcon } from "lucide-react";

/** A club tab with nothing to show: centered in the free space, with the tab's icon in soft gray. */
export function EmptyTab({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[50svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/60">
        <Icon className="size-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="max-w-64 text-sm text-zinc-500">{children}</p>
    </div>
  );
}
