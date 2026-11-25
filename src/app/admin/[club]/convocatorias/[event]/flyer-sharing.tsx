"use client";

import { useState } from "react";
import { FormMessage } from "@/components/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { shareImage } from "./share-image";

/** HU-37: download or share the 9:16 flyer for TikTok and Instagram stories. */
export function FlyerSharing(props: { flyerPath: string; fileName: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <section aria-labelledby="flyer-title" className="flex flex-col gap-2">
      <h2 id="flyer-title" className="text-lg font-semibold">
        Flyer para historias
      </h2>
      <p className="text-sm text-zinc-500">
        Fecha, lugar, precio y cupos libres, en formato 9:16 para TikTok e Instagram.
      </p>
      <div className="flex gap-2">
        <a
          href={props.flyerPath}
          download={props.fileName}
          className={buttonVariants({ variant: "outline", className: "h-10 flex-1" })}
        >
          Descargar PNG
        </a>
        <Button
          type="button"
          className="h-10 flex-1"
          onClick={async () => setFailed(!(await shareImage(props.flyerPath, props.fileName)))}
        >
          Compartir
        </Button>
      </div>
      {failed && (
        <FormMessage tone="error">No pudimos compartir el flyer. Prueba descargarlo.</FormMessage>
      )}
    </section>
  );
}
