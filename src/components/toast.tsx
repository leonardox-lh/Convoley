"use client";

import { CircleCheck, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const VISIBLE_MS = 4500;
const STACK_ID = "toast-stack";

function toastStack(): HTMLElement {
  let stack = document.getElementById(STACK_ID);
  if (!stack) {
    stack = document.createElement("div");
    stack.id = STACK_ID;
    stack.className =
      "pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4";
    document.body.append(stack);
  }
  return stack;
}

const noop = () => () => undefined;

/** A success message that floats at the top for a few seconds, then leaves on its own. */
export function Toast({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const isClient = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient || !open) return null;
  return createPortal(
    <div
      role="status"
      className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-emerald-200 bg-card p-3.5 pr-10 text-sm shadow-xl animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
      <div className="text-foreground">{children}</div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar"
        className="absolute top-2.5 right-2.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-1 w-full origin-left bg-emerald-500"
        style={{ animation: `toast-timer ${VISIBLE_MS}ms linear forwards` }}
      />
    </div>,
    toastStack(),
  );
}
