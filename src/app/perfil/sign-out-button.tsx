"use client";

import { LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

/** "Cerrar sesión", asking first so a stray tap doesn't sign the player out. */
export function SignOutButton({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="border-t pt-6">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setConfirming(true)}
        className="h-11 w-full gap-1.5 border-destructive bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut aria-hidden />
        Cerrar sesión
      </Button>
      {confirming && (
        <ConfirmDialog
          title="¿Cerrar sesión?"
          description="Tendrás que volver a ingresar para inscribirte o entrar a tu club."
          confirmLabel="Cerrar sesión"
          pending={pending}
          onConfirm={() => startTransition(signOutAction)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
