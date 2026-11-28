"use client";

import { ImageUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Photo upload drawn like the other fields: a dashed tap area with the chosen file's name and a
 * thumbnail, instead of the browser's "Seleccionar archivo" button.
 */
export function FileField(props: {
  label: string;
  name: string;
  accept: string;
  required?: boolean;
  multiple?: boolean;
  hint?: React.ReactNode;
  /** The image already saved, shown until another file is chosen. */
  currentImage?: string | null;
}) {
  const [chosen, setChosen] = useState<{ names: string; preview: string | null } | null>(null);
  const preview = chosen ? chosen.preview : (props.currentImage ?? null);
  const thumbnailSize = props.currentImage ? "size-16" : "size-11";

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (chosen?.preview) URL.revokeObjectURL(chosen.preview);
    if (files.length === 0) return setChosen(null);
    setChosen({
      names: files.length === 1 ? files[0].name : `${files.length} fotos elegidas`,
      preview: files[0].type.startsWith("image/") ? URL.createObjectURL(files[0]) : null,
    });
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="relative flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-input bg-card px-3.5 py-3 transition-colors hover:border-primary/50 has-[:focus-visible]:border-primary">
        <input
          type="file"
          name={props.name}
          accept={props.accept}
          required={props.required}
          multiple={props.multiple}
          onChange={onChange}
          className="peer sr-only"
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- the chosen file or the saved image
          <img
            src={preview}
            alt=""
            className={cn(
              thumbnailSize,
              "shrink-0 rounded-lg",
              // A saved QR or logo must show whole; a fresh photo can be cropped.
              props.currentImage ? "border bg-white object-contain" : "object-cover",
            )}
          />
        ) : (
          <span
            className={cn(
              thumbnailSize,
              "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            )}
          >
            <ImageUp className="size-5" aria-hidden />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-muted-foreground">{props.label}</span>
          <span className="truncate text-sm font-semibold text-primary">
            {chosen?.names ??
              (props.currentImage
                ? "Toca para cambiarla"
                : props.multiple
                  ? "Toca para elegir fotos"
                  : "Toca para elegir una foto")}
          </span>
        </span>
      </span>
      {props.hint && <span className="px-1 text-xs text-muted-foreground">{props.hint}</span>}
    </label>
  );
}
