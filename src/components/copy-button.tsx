"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const COPIED_FEEDBACK_MS = 2000;

/** Icon button that copies `text` and shows a check for a moment. */
export function CopyButton({ text, label }: { text: string; label: string }) {
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
      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
    >
      {copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}
