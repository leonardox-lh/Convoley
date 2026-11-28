"use client";

import { Share2 } from "lucide-react";
import type { ReactNode } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Ball } from "@/components/logo";
import { type ShareImageStatus, useShareImage } from "./share-image";

/** A section title with one "Compartir" button that opens the phone's share sheet. */
export function ShareImageSection(props: {
  id: string;
  title: string;
  imagePath: string;
  fileName: string;
}) {
  const { status, failed, share } = useShareImage(props.imagePath, props.fileName);
  return (
    <section aria-labelledby={props.id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id={props.id} className="text-lg font-semibold">
          {props.title}
        </h2>
        <Button
          type="button"
          className="h-10 gap-1.5"
          disabled={status === "generating"}
          onClick={share}
        >
          <ShareButtonContent status={status} icon={<Share2 aria-hidden />}>
            Compartir
          </ShareButtonContent>
        </Button>
      </div>
      {failed && (
        <FormMessage tone="error">No pudimos compartir la imagen. Inténtalo otra vez.</FormMessage>
      )}
    </section>
  );
}

/** The share button's label: a spinning ball while the image is built, then "ready to share". */
export function ShareButtonContent(props: {
  status: ShareImageStatus;
  icon?: ReactNode;
  children: ReactNode;
}) {
  if (props.status === "generating") {
    return (
      <span role="status" className="flex items-center gap-1.5">
        <Ball className="size-4 animate-spin [animation-duration:1.2s] motion-reduce:animate-none" />
        Generando…
      </span>
    );
  }
  return (
    <>
      {props.icon}
      {props.status === "ready" ? "¡Lista! Toca para compartir" : props.children}
    </>
  );
}
