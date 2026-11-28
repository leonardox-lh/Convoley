"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PROFILE_BUTTON_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-border transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** The person icon for visitors: opens a short invitation to sign in, coming back to this page after. */
export function SignInPrompt(props: { signInPath: string; returnPathParam: string }) {
  // The page to come back to, read when the prompt opens.
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const close = () => setReturnPath(null);
  const signInHref = `${props.signInPath}?${new URLSearchParams({ [props.returnPathParam]: returnPath ?? "/" })}`;

  return (
    <>
      <button
        type="button"
        aria-label="Iniciar sesión"
        onClick={() => setReturnPath(window.location.pathname + window.location.search)}
        className={PROFILE_BUTTON_CLASS}
      >
        <UserRound className="size-5" aria-hidden />
      </button>
      {returnPath !== null && (
        <Modal title="Inicia sesión" onClose={close}>
          <p className="text-sm text-muted-foreground">
            Con tu cuenta te inscribes más rápido, sin llenar tus datos cada vez, y ves tus
            inscripciones y pedidos desde cualquier celular.
          </p>
          <Link
            href={signInHref}
            onClick={close}
            className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}
          >
            Iniciar sesión
          </Link>
          <button
            type="button"
            onClick={close}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Ahora no
          </button>
        </Modal>
      )}
    </>
  );
}
