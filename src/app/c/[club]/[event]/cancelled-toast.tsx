"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/toast";

const PARAM = "cancelado";

/**
 * HU-29: "Inscripción cancelada" after the player cancels and lands back here. The link loses
 * ?cancelado right away, so reloading doesn't show it again; the first message stays in state
 * because AutoRefresh re-renders the page without the param.
 */
export function CancelledToast({ message }: { message: string | null }) {
  const [shown] = useState(message);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PARAM)) return;
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  if (!shown) return null;
  return (
    <Toast>
      <p className="font-semibold">Inscripción cancelada</p>
      <p className="text-muted-foreground">{shown}</p>
    </Toast>
  );
}
