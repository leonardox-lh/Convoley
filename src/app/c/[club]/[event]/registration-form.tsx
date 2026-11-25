"use client";

import Link from "next/link";
import { Toast } from "@/components/toast";
import { useActionState, useState } from "react";
import { Field, fieldClass, FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PlayerProfile } from "@/modules/identity";
import { GenderSelect } from "../../../gender-select";
import { LEVEL_LABELS, POSITION_LABELS } from "../../../player-labels";
import { PaymentInstructions, type PaymentInfo } from "./payment-instructions";
import { continueWithGoogleAction, registerAction, type RegisterState } from "./actions";

export function RegistrationForm({
  club,
  eventId,
  profile,
  googleEnabled,
  waitlistOnly,
  paymentInfo,
  isMixed,
  lastChoices,
}: {
  /** HU-31: mixed events ask the gender, for the minimum of women per team. */
  isMixed: boolean;
  paymentInfo: PaymentInfo;
  club: string;
  eventId: string;
  /** The event is full: signing up joins the waitlist (HU-12). */
  waitlistOnly: boolean;
  /** The Google player's account; null for guests. */
  profile: PlayerProfile | null;
  googleEnabled: boolean;
  /** Position and level from the player's last sign-up, to prefill the form. */
  lastChoices: { position: string | null; level: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {
    status: "idle",
  });
  const [asGuest, setAsGuest] = useState(false);
  const heading = waitlistOnly ? "Entra a la lista de espera" : "Inscríbete";

  if (state.status === "registered" && state.waitlistPosition !== null) {
    return (
      <section
        aria-labelledby="registered-title"
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <Toast>Inscripción enviada: estás en la lista de espera.</Toast>
        <h2 id="registered-title" className="text-lg font-semibold">
          {state.firstName}, estás en la lista de espera.
        </h2>
        <p className="text-sm">
          Tu puesto: <span className="font-semibold">{state.waitlistPosition}</span>
        </p>
        <p className="text-sm text-zinc-500">
          Si se libera un cupo, pasas automáticamente a la lista y te toca pagar.
        </p>
        <RegistrationLink registrationId={state.registrationId} />
        {profile && (
          <Link href="/mis-inscripciones" className="text-sm underline underline-offset-4">
            Ver mis inscripciones
          </Link>
        )}
      </section>
    );
  }

  if (state.status === "registered") {
    return (
      <section
        aria-labelledby="registered-title"
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <Toast>¡Inscripción enviada! Ya estás en la lista.</Toast>
        <h2 id="registered-title" className="text-lg font-semibold">
          ¡Listo, {state.firstName}! Ya estás inscrito.
        </h2>
        <p className="text-sm">
          Estado:{" "}
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Pendiente de pago
          </span>
        </p>
        <PaymentInstructions info={paymentInfo} />
        <Link
          href={`/inscripcion/${state.registrationId}`}
          className={buttonVariants({ size: "lg", className: "h-11" })}
        >
          Ya pagué: subir mi captura
        </Link>
        <RegistrationLink registrationId={state.registrationId} />
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
        <h2 className="text-lg font-semibold">{heading}</h2>
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
      <h2 className="text-lg font-semibold">{heading}</h2>
      <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        {profile?.firstName ? (
          <>
            <p className="text-sm">
              Te inscribes como{" "}
              <span className="font-medium">
                {`${profile.firstName} ${profile.lastName}`.trim()}
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
              label="Apellido (opcional)"
              required={false}
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
            label="Celular (opcional)"
            required={false}
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="987654321"
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <OptionalSelect
            label="Posición"
            name="position"
            options={POSITION_LABELS}
            defaultValue={lastChoices?.position}
          />
          <OptionalSelect
            label="Nivel"
            name="level"
            options={LEVEL_LABELS}
            defaultValue={lastChoices?.level}
          />
        </div>
        {isMixed && <GenderSelect />}
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Inscribiendo…" : waitlistOnly ? "Anotarme en la espera" : "Inscribirme"}
        </Button>
      </form>
    </section>
  );
}

function OptionalSelect(props: {
  label: string;
  name: string;
  options: Record<string, string>;
  defaultValue?: string | null;
}) {
  return (
    <Field label={<>{props.label} (opcional)</>} float="always">
      <select name={props.name} defaultValue={props.defaultValue ?? ""} className={fieldClass}>
        <option value="">—</option>
        {Object.entries(props.options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Guests have no account: this private link is how they come back to their sign-up. */
function RegistrationLink({ registrationId }: { registrationId: string }) {
  return (
    <p className="text-xs text-zinc-500">
      Guarda este link para ver tu inscripción después:{" "}
      <Link href={`/inscripcion/${registrationId}`} className="break-all underline">
        /inscripcion/{registrationId}
      </Link>
    </p>
  );
}
