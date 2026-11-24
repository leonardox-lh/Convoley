"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { PlayerProfile } from "@/modules/identity";
import { continueWithGoogleAction, registerAction, type RegisterState } from "./actions";

export function RegistrationForm({
  club,
  eventId,
  profile,
  googleEnabled,
}: {
  club: string;
  eventId: string;
  /** The Google player's account; null for guests. */
  profile: PlayerProfile | null;
  googleEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {
    status: "idle",
  });
  const [asGuest, setAsGuest] = useState(false);

  if (state.status === "registered") {
    return (
      <section
        aria-labelledby="registered-title"
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 id="registered-title" className="text-lg font-semibold">
          ¡Listo, {state.firstName}! Ya estás inscrito.
        </h2>
        <p className="text-sm">
          Estado:{" "}
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Pendiente de pago
          </span>
        </p>
        <p className="text-sm text-zinc-500">Paga al organizador para asegurar tu cupo.</p>
        {profile && (
          <Link href="/mis-inscripciones" className="text-sm underline underline-offset-4">
            Ver mis inscripciones
          </Link>
        )}
      </section>
    );
  }

  if (!profile && !asGuest) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Inscríbete</h2>
        <Button size="lg" onClick={() => setAsGuest(true)}>
          Continuar como invitado
        </Button>
        {googleEnabled && (
          <form action={continueWithGoogleAction} className="flex flex-col">
            <input type="hidden" name="club" value={club} />
            <input type="hidden" name="eventId" value={eventId} />
            <Button type="submit" size="lg" variant="outline">
              Continuar con Google
            </Button>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Inscríbete</h2>
      <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        {profile?.firstName && profile.lastName ? (
          <>
            <p className="text-sm">
              Te inscribes como{" "}
              <span className="font-medium">
                {profile.firstName} {profile.lastName}
              </span>
              {profile.phone && ` · ${profile.phone.replace(/^\+51/, "")}`}
            </p>
            <input type="hidden" name="firstName" value={profile.firstName} />
            <input type="hidden" name="lastName" value={profile.lastName} />
          </>
        ) : (
          <>
            <TextField
              label="Nombre"
              name="firstName"
              autoComplete="given-name"
              defaultValue={profile?.firstName}
            />
            <TextField
              label="Apellido"
              name="lastName"
              autoComplete="family-name"
              defaultValue={profile?.lastName}
            />
          </>
        )}
        {profile?.phone ? (
          <input type="hidden" name="phone" value={profile.phone} />
        ) : (
          <TextField
            label="Celular"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="987654321"
          />
        )}
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Inscribiendo…" : "Inscribirme"}
        </Button>
      </form>
    </section>
  );
}
