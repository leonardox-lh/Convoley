"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const COPIED_FEEDBACK_MS = 2000;

/** Icon button that copies `text` and shows a check for a moment; `showLabel` adds the text. */
export function CopyButton({
  text,
  label,
  showLabel = false,
}: {
  text: string;
  label: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copiado" : label}
      title={label}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      }}
      className={
        showLabel
          ? "flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors hover:bg-secondary hover:text-primary"
          : "flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
      }
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {showLabel && <span aria-hidden>{copied ? "Copiado" : label}</span>}
    </button>
  );
}
