"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import { shareImage } from "./share-image";

/** A section title with one "Compartir" button that opens the phone's share sheet. */
export function ShareImageSection(props: {
  id: string;
  title: string;
  imagePath: string;
  fileName: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <section aria-labelledby={props.id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id={props.id} className="text-lg font-semibold">
          {props.title}
        </h2>
        <Button
          type="button"
          className="h-10 gap-1.5"
          onClick={async () => setFailed(!(await shareImage(props.imagePath, props.fileName)))}
        >
          <Share2 aria-hidden />
          Compartir
        </Button>
      </div>
      {failed && (
        <FormMessage tone="error">No pudimos compartir la imagen. Inténtalo otra vez.</FormMessage>
      )}
    </section>
  );
}
