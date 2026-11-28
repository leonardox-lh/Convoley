"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldClass, FormMessage, submitKeepingValues, TextField } from "@/components/form";
import type { ClubFormState } from "./club-form-schema";
import { cn } from "@/lib/utils";
import { LogoCropper } from "./logo-cropper";

const BYTES_PER_MB = 1024 * 1024;

export interface ClubProfileDefaults {
  name: string;
  description: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  contactPhone: string | null;
}

/** Club profile fields, shared by "create club" and "edit profile". */
export function ClubProfileForm(props: {
  action: (state: ClubFormState, formData: FormData) => Promise<ClubFormState>;
  maxLogoBytes: number;
  submitLabel: string;
  defaults?: ClubProfileDefaults;
  /** Set when editing; without it the form asks for the club's link. */
  clubSlug?: string;
  /** The stored logo, shown until a new one is picked. */
  logoUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(props.action, { status: "idle" });
  const [logoError, setLogoError] = useState<string | null>(null);
  const submit = submitKeepingValues(formAction);
  const maxLogoMb = props.maxLogoBytes / BYTES_PER_MB;
  const defaults = props.defaults;

  // Checked here too so a big file fails fast instead of hitting the server's upload limit.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const logo = new FormData(event.currentTarget).get("logo");
    if (logo instanceof File && logo.size > props.maxLogoBytes) {
      event.preventDefault();
      setLogoError(`El logo debe pesar hasta ${maxLogoMb} MB.`);
      return;
    }
    setLogoError(null);
    submit(event);
  }

  const error = logoError ?? (state.status === "error" ? state.message : null);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {props.clubSlug && <input type="hidden" name="clubSlug" value={props.clubSlug} />}
      <TextField label="Nombre del club" name="name" maxLength={60} defaultValue={defaults?.name} />
      {!props.clubSlug && (
        <Field
          label="Link de tu club (opcional)"
          float="always"
          hint="Si lo dejas vacío, lo armamos con el nombre. Luego no se puede cambiar."
        >
          <input
            name="slug"
            placeholder="voley-miraflores"
            className={cn(fieldClass, "pl-[6.75rem]")}
          />
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-muted-foreground">
            convoley.pe/
          </span>
        </Field>
      )}
      <Field label="Descripción (opcional)" float="always">
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={defaults?.description ?? ""}
          className={fieldClass}
        />
      </Field>
      <LogoCropper
        currentLogoUrl={props.logoUrl}
        hint={`Cuadrado, JPG, PNG o WEBP, hasta ${maxLogoMb} MB${defaults ? ". Déjalo así para mantenerlo" : ""}.`}
      />
      <TextField
        label="Instagram (opcional)"
        name="instagramUrl"
        required={false}
        inputMode="url"
        placeholder="instagram.com/tuclub"
        defaultValue={defaults?.instagramUrl ?? ""}
      />
      <TextField
        label="TikTok (opcional)"
        name="tiktokUrl"
        required={false}
        inputMode="url"
        placeholder="tiktok.com/@tuclub"
        defaultValue={defaults?.tiktokUrl ?? ""}
      />
      <TextField
        label="Comunidad de WhatsApp (opcional)"
        name="whatsappUrl"
        required={false}
        inputMode="url"
        placeholder="chat.whatsapp.com/…"
        defaultValue={defaults?.whatsappUrl ?? ""}
      />
      <TextField
        label="WhatsApp del administrador (opcional)"
        name="contactPhone"
        required={false}
        type="tel"
        inputMode="numeric"
        placeholder="987654321"
        defaultValue={defaults?.contactPhone?.replace(/^\+51/, "") ?? ""}
      />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : props.submitLabel}
      </Button>
    </form>
  );
}
