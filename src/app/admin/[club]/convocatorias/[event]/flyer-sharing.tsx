"use client";

import { useState } from "react";
import { FormMessage } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { shareImage } from "./share-image";

/** HU-37: download or share the flyer: 4:5 for the feed and WhatsApp, 9:16 for stories. */
export function FlyerSharing(props: { flyerPath: string; fileName: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <section aria-labelledby="flyer-title" className="flex flex-col gap-2">
      <h2 id="flyer-title" className="text-lg font-semibold">
        Flyer de la convocatoria
      </h2>
      <p className="text-sm text-muted-foreground">
        Fecha, lugar, precio y cupos libres, listo para Instagram y WhatsApp.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={props.flyerPath}
          download={props.fileName}
          className={buttonVariants({ variant: "outline", className: "h-10" })}
        >
          Descargar PNG
        </a>
        <Button
          type="button"
          className="h-10"
          onClick={async () => setFailed(!(await shareImage(props.flyerPath, props.fileName)))}
        >
          Compartir
        </Button>
      </div>
      <a
        href={`${props.flyerPath}?formato=historia`}
        download={props.fileName.replace(/\.png$/, "-historia.png")}
        className="text-center text-sm text-muted-foreground underline"
      >
        Descargar versión para historias (9:16)
      </a>
      {failed && (
        <FormMessage tone="error">No pudimos compartir el flyer. Prueba descargarlo.</FormMessage>
      )}
    </section>
  );
}
