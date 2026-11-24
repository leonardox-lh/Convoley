"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass, FormMessage, submitKeepingValues, TextField } from "@/components/form";
import type { ClubFormState } from "./club-form-schema";

// Volleyball blue and yellow, until the club picks its own.
const DEFAULT_PRIMARY_COLOR = "#1d4ed8";
const DEFAULT_SECONDARY_COLOR = "#facc15";
const BYTES_PER_MB = 1024 * 1024;

export interface ClubProfileDefaults {
  name: string;
  description: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
}

/** Club profile fields, shared by "create club" and "edit profile". */
export function ClubProfileForm(props: {
  action: (state: ClubFormState, formData: FormData) => Promise<ClubFormState>;
  maxLogoBytes: number;
  submitLabel: string;
  defaults?: ClubProfileDefaults;
  /** Set when editing; without it the form asks for the club's link. */
  clubSlug?: string;
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
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Link de tu club (opcional)
          <span className="flex items-center gap-1">
            <span className="text-zinc-500">convoley.pe/</span>
            <input name="slug" placeholder="voley-miraflores" className={fieldClass} />
          </span>
          <span className="text-xs font-normal text-zinc-500">
            Si lo dejas vacío, lo armamos con el nombre. Luego no se puede cambiar.
          </span>
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Descripción (opcional)
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={defaults?.description ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Logo (JPG, PNG o WEBP, hasta {maxLogoMb} MB
        {defaults ? "; déjalo vacío para mantenerlo" : ""})
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          className="text-base"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Color principal"
          name="primaryColor"
          defaultValue={defaults?.primaryColor ?? DEFAULT_PRIMARY_COLOR}
        />
        <ColorField
          label="Color secundario"
          name="secondaryColor"
          defaultValue={defaults?.secondaryColor ?? DEFAULT_SECONDARY_COLOR}
        />
      </div>
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
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Guardando…" : props.submitLabel}
      </Button>
    </form>
  );
}

function ColorField(props: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {props.label}
      <input
        type="color"
        name={props.name}
        defaultValue={props.defaultValue}
        className="h-11 w-full cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700"
      />
    </label>
  );
}
