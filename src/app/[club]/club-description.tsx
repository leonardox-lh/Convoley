"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

/** The description cut to the logo's height; "Ver más" opens all of it in a modal. */
export function ClubDescription({ clubName, text }: { clubName: string; text: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isCut, setIsCut] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (element) setIsCut(element.scrollHeight > element.clientHeight + 1);
  }, [text]);

  return (
    <>
      <p ref={textRef} className="line-clamp-3 text-sm whitespace-pre-line text-white/85">
        {text}
      </p>
      {isCut && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="self-start text-xs font-semibold text-white underline underline-offset-4 hover:text-white/80"
        >
          Ver más
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby="club-description-title"
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95"
      >
        <div className="flex max-h-[80vh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <h2 id="club-description-title" className="text-lg font-semibold">
              {clubName}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="overflow-y-auto px-5 py-4 text-sm leading-relaxed whitespace-pre-line">
            {text}
          </p>
        </div>
      </dialog>
    </>
  );
}
