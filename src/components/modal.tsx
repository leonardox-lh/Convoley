"use client";

import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";

/** Sheet from the bottom on phones, centered card on wider screens; Escape or a tap outside closes. */
export function Modal(props: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** "alertdialog" when it asks before something that can't be undone. */
  role?: "dialog" | "alertdialog";
  /** e.g. a wider max-w for content with photos. */
  className?: string;
}) {
  const { onClose } = props;
  const titleId = useId();
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 animate-in fade-in duration-150 sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role={props.role ?? "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex w-full max-w-xs flex-col gap-3 rounded-3xl bg-card p-5 text-left text-foreground shadow-xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-200",
          props.className,
        )}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {props.title}
        </h2>
        {props.children}
      </div>
    </div>
  );
}
