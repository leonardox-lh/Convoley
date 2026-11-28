"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { heroBackground } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { VolleyballIcon } from "@/components/volleyball";

/** The description clamped to two lines (ellipsis on the text); "Ver más" at the end of the second opens it all in a modal. */
export function ClubDescription(props: {
  clubName: string;
  primaryColor: string | null;
  text: string;
}) {
  const { clubName, primaryColor, text } = props;
  const textRef = useRef<HTMLParagraphElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isCut, setIsCut] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (element) setIsCut(element.scrollHeight > element.clientHeight + 1);
  }, [text]);

  return (
    <>
      <p ref={textRef} className="line-clamp-2 text-sm whitespace-pre-line text-white/85">
        {isCut && (
          <>
            {/* The 1-line spacer pushes the floated button down to the end of the second line. */}
            <span aria-hidden className="float-right h-[1lh] w-0" />
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="clear-both float-right pl-2 font-semibold text-white underline underline-offset-4 hover:text-white/80"
            >
              Ver más
            </button>
          </>
        )}
        {text}
      </p>
      <dialog
        ref={dialogRef}
        aria-labelledby="club-description-title"
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        // Bottom sheet on phones, centered card from sm up, like the app's Modal.
        className="mx-auto mt-auto mb-0 w-full max-w-md overflow-hidden rounded-t-3xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:slide-in-from-bottom-4 open:fade-in sm:m-auto sm:w-[calc(100%-2rem)] sm:rounded-3xl"
      >
        <div className="flex max-h-[80vh] flex-col">
          <div
            className="relative flex items-start justify-between gap-3 overflow-hidden px-5 pt-5 pb-4 text-white"
            style={heroBackground(primaryColor)}
          >
            <VolleyballIcon className="pointer-events-none absolute -top-8 -right-8 size-28 opacity-15" />
            <div className="relative min-w-0">
              <p className="text-xs font-medium text-white/70">Sobre el club</p>
              <h2
                id="club-description-title"
                className="text-xl leading-tight font-extrabold tracking-tight first-letter:uppercase"
              >
                {clubName}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="relative rounded-full bg-white/15 p-1.5 text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="overflow-y-auto px-5 py-4 text-sm leading-relaxed whitespace-pre-line text-foreground/85">
            {text}
          </p>
          <div className="border-t px-5 py-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => dialogRef.current?.close()}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
