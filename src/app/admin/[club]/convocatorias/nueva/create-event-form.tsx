"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { EventFields, fieldClass, FormMessage, submitKeepingValues } from "../event-fields";
import { createEventAction, type CreateEventState } from "./actions";

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

  if (state.status === "created") return <ShareLink {...state} />;

  return (
    <form onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <EventFields {...props} />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
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

function ShareLink({
  sharePath,
  editPath,
  published,
}: {
  sharePath: string;
  editPath: string;
  published: boolean;
}) {
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
      <Link
        href={editPath}
        className="text-center text-sm font-medium underline-offset-4 hover:underline"
      >
        Editar convocatoria
      </Link>
    </section>
  );
}
