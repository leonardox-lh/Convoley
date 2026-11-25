"use client";

import { useState } from "react";
import { FormMessage } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { shareImage } from "./share-image";

const FORMATS = [
  { value: "cuadrado", label: "Cuadrado (1:1)" },
  { value: "historia", label: "Historia (9:16)" },
] as const;

/** Download or share the list image (HU-16) and copy the list as text (HU-17). */
export function ListSharing(props: { imagePath: string; fileName: string; listText: string }) {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function share(format: string) {
    const shared = await shareImage(
      `${props.imagePath}?formato=${format}`,
      `${props.fileName}-${format}.png`,
    );
    if (!shared) {
      setMessage({ tone: "error", text: "No pudimos compartir la imagen. Prueba descargarla." });
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(props.listText);
      setMessage({ tone: "ok", text: "Lista copiada. Pégala en WhatsApp." });
    } catch {
      setMessage({ tone: "error", text: "No pudimos copiar la lista." });
    }
  }

  return (
    <section aria-labelledby="share-title" className="flex flex-col gap-3">
      <h2 id="share-title" className="text-lg font-semibold">
        Compartir la lista
      </h2>
      {FORMATS.map((format) => (
        <div key={format.value} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{format.label}</span>
          <div className="grid grid-cols-2 gap-2">
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
        </div>
      ))}
      <Button type="button" variant="outline" className="h-10" onClick={copyText}>
        Copiar lista como texto
      </Button>
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
    </section>
  );
}
