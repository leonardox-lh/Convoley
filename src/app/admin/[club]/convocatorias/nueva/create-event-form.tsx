"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SavedVenue } from "@/components/location-picker";
import { EventFields, fieldClass, FormMessage, submitKeepingValues } from "../event-fields";
import { canShareImages, useShareImage } from "../[event]/share-image";
import { ShareButtonContent } from "../[event]/share-image-section";
import { createEventAction, type CreateEventState } from "./actions";

export function CreateEventForm(props: {
  clubSlug: string;
  communities: { id: string; name: string }[];
  minDate: string;
  defaultDate: string;
  savedVenues: SavedVenue[];
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
  flyerPath,
  published,
}: {
  sharePath: string;
  editPath: string;
  flyerPath: string;
  published: boolean;
}) {
  const url = `${window.location.origin}${sharePath}`;
  // Phones share the flyer plus the link; elsewhere WhatsApp only takes text.
  const withFlyer = canShareImages();
  const { status, failed, share } = useShareImage(flyerPath, "convocatoria.png", url);

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
      <div className="relative">
        <input
          readOnly
          value={url}
          aria-label="Link para compartir"
          className={`${fieldClass} pr-12`}
          onFocus={(e) => e.target.select()}
        />
        <CopyButton
          text={url}
          label="Copiar link"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        />
      </div>
      {published &&
        (withFlyer ? (
          <Button
            type="button"
            size="lg"
            className="h-11 bg-green-600 text-white hover:bg-green-700"
            disabled={status === "generating"}
            onClick={share}
          >
            <ShareButtonContent status={status}>Compartir por WhatsApp</ShareButtonContent>
          </Button>
        ) : (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 bg-green-600 text-white hover:bg-green-700",
            )}
          >
            Compartir por WhatsApp
          </a>
        ))}
      {failed && (
        <FormMessage tone="error">No pudimos compartir el flyer. Inténtalo otra vez.</FormMessage>
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
