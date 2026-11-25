"use client";

import { useActionState } from "react";
import { FormMessage, submitKeepingValues, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { PlayerProfile } from "@/modules/identity";
import { type ProfileState, updateProfileAction } from "./actions";

const LOCAL_PHONE = /^\+51/;

export function ProfileForm({ profile }: { profile: PlayerProfile }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {
    status: "idle",
  });

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <TextField
        label="Nombre"
        name="firstName"
        autoComplete="given-name"
        defaultValue={profile.firstName}
      />
      <TextField
        label="Apellido"
        name="lastName"
        autoComplete="family-name"
        defaultValue={profile.lastName}
        required={false}
      />
      <TextField
        label="Celular"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        defaultValue={profile.phone?.replace(LOCAL_PHONE, "") ?? ""}
        required={false}
      />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "saved" && <FormMessage tone="ok">Guardamos tus datos.</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}
