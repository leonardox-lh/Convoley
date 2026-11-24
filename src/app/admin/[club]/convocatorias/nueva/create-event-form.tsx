"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createEventAction, type CreateEventState } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-700 dark:bg-zinc-900";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";
const COPIED_FEEDBACK_MS = 2000;

export function CreateEventForm(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
  minDate: string;
}) {
  const [state, formAction, pending] = useActionState<CreateEventState, FormData>(
    createEventAction,
    { status: "idle" },
  );

  // Submitting by hand instead of <form action> keeps the typed values when there is an error;
  // React resets uncontrolled fields after a form action.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  if (state.status === "created") return <ShareLink {...state} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <label className={labelClass}>
        Nombre
        <input
          name="title"
          required
          maxLength={80}
          placeholder="Mixto intermedio"
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Nivel
        <select name="communityId" required className={fieldClass}>
          {props.communities.map((community) => (
            <option key={community.id} value={community.id}>
              {community.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Fecha
          <input type="date" name="date" required min={props.minDate} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Hora
          <input type="time" name="time" required className={fieldClass} />
        </label>
      </div>
      <label className={labelClass}>
        Lugar
        <input
          name="venueName"
          required
          maxLength={120}
          placeholder="Coliseo Manuel Bonilla"
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Link de Google Maps (opcional)
        <input
          type="url"
          name="mapsUrl"
          placeholder="https://maps.app.goo.gl/..."
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Precio (S/)
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="15"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Cupos
          <input
            type="number"
            name="capacity"
            required
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="18"
            className={fieldClass}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isMixed" className="size-5" />
        Mixto
      </label>
      <label className={labelClass}>
        Reglas (opcional)
        <textarea
          name="rules"
          rows={3}
          maxLength={500}
          placeholder="Mínimo 2 mujeres por equipo"
          className={fieldClass}
        />
      </label>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          name="intent"
          value="published"
          size="lg"
          className="h-11"
          disabled={pending}
        >
          Publicar convocatoria
        </Button>
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="outline"
          size="lg"
          className="h-11"
          disabled={pending}
        >
          Guardar borrador
        </Button>
      </div>
    </form>
  );
}

function ShareLink({ sharePath, published }: { sharePath: string; published: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${sharePath}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {published ? "¡Convocatoria publicada!" : "Borrador guardado"}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {published
          ? "Comparte este link en tu grupo de WhatsApp para abrir las inscripciones:"
          : "Este será el link para compartir. Los jugadores podrán abrirlo cuando la publiques."}
      </p>
      <input
        readOnly
        value={url}
        aria-label="Link para compartir"
        className={fieldClass}
        onFocus={(e) => e.target.select()}
      />
      <Button type="button" size="lg" className="h-11" onClick={copy}>
        {copied ? "¡Copiado!" : "Copiar link"}
      </Button>
      {published && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm font-medium text-green-700 underline-offset-4 hover:underline dark:text-green-400"
        >
          Compartir por WhatsApp
        </a>
      )}
    </section>
  );
}
