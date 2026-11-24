"use client";

import { useState } from "react";
import { FormMessage } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";

const FORMATS = [
  { value: "cuadrado", label: "Cuadrado (1:1)" },
  { value: "historia", label: "Historia (9:16)" },
] as const;

/** Download or share the list image (HU-16). */
export function ListSharing(props: { imagePath: string; fileName: string }) {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function share(format: string) {
    const url = `${props.imagePath}?formato=${format}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
      const file = new File([await response.blob()], `${props.fileName}-${format}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      // Desktop browsers can't share files: fall back to downloading it.
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
      // Revoked on the next tick: revoking right away can cancel the download.
      setTimeout(() => URL.revokeObjectURL(link.href));
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage({ tone: "error", text: "No pudimos compartir la imagen. Prueba descargarla." });
    }
  }

  return (
    <section aria-labelledby="share-title" className="flex flex-col gap-3">
      <h2 id="share-title" className="text-lg font-semibold">
        Compartir la lista
      </h2>
      {FORMATS.map((format) => (
        <div key={format.value} className="flex items-center gap-2">
          <span className="flex-1 text-sm">{format.label}</span>
          <a
            href={`${props.imagePath}?formato=${format.value}`}
            download={`${props.fileName}-${format.value}.png`}
            className={buttonVariants({ variant: "outline", className: "h-10" })}
          >
            Descargar PNG
          </a>
          <Button type="button" className="h-10" onClick={() => share(format.value)}>
            Compartir
          </Button>
        </div>
      ))}
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
    </section>
  );
}
