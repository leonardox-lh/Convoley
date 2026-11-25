"use client";

import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const FRAME_PX = 256;
const OUTPUT_PX = 512;
const MAX_ZOOM = 3;
const OUTPUT_TYPE = "image/webp";
const OUTPUT_QUALITY = 0.9;

type Crop = { src: string; width: number; height: number; zoom: number; x: number; y: number };

/** File input for the club logo: the organizer picks a square part of the image before upload. */
export function LogoCropper(props: { hint: string; currentLogoUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const baseScale = crop ? FRAME_PX / Math.min(crop.width, crop.height) : 1;
  const shownWidth = crop ? crop.width * baseScale * crop.zoom : 0;
  const shownHeight = crop ? crop.height * baseScale * crop.zoom : 0;

  // Keeps the image covering the whole square, so the logo never has empty corners.
  function clamp(next: Crop): Crop {
    const scale = (FRAME_PX / Math.min(next.width, next.height)) * next.zoom;
    const minX = FRAME_PX - next.width * scale;
    const minY = FRAME_PX - next.height * scale;
    return { ...next, x: Math.min(0, Math.max(minX, next.x)), y: Math.min(0, Math.max(minY, next.y)) };
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = FRAME_PX / Math.min(image.width, image.height);
      setCrop({
        src,
        width: image.width,
        height: image.height,
        zoom: 1,
        x: (FRAME_PX - image.width * scale) / 2,
        y: (FRAME_PX - image.height * scale) / 2,
      });
    };
    image.src = src;
  }

  function onZoom(zoom: number) {
    if (!crop) return;
    // Zoom around the center of the square.
    const center = FRAME_PX / 2;
    const ratio = zoom / crop.zoom;
    setCrop(
      clamp({
        ...crop,
        zoom,
        x: center - (center - crop.x) * ratio,
        y: center - (center - crop.y) * ratio,
      }),
    );
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, x: crop.x, y: crop.y };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !crop) return;
    setCrop(
      clamp({
        ...crop,
        x: drag.x + event.clientX - drag.startX,
        y: drag.y + event.clientY - drag.startY,
      }),
    );
  }

  function cancel() {
    if (crop) URL.revokeObjectURL(crop.src);
    setCrop(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function confirm() {
    const image = imageRef.current;
    const input = inputRef.current;
    if (!crop || !image || !input) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_PX;
    canvas.height = OUTPUT_PX;
    const k = OUTPUT_PX / FRAME_PX;
    canvas.getContext("2d")?.drawImage(image, crop.x * k, crop.y * k, shownWidth * k, shownHeight * k);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const files = new DataTransfer();
        files.items.add(new File([blob], "logo.webp", { type: OUTPUT_TYPE }));
        input.files = files.files;
        setPreview(canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY));
        URL.revokeObjectURL(crop.src);
        setCrop(null);
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  }

  const shown = preview ?? props.currentLogoUrl;

  return (
    <div className="flex flex-col gap-2 text-sm font-medium">
      <span>Logo</span>
      <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-input bg-card p-4 transition-colors hover:border-primary/50 hover:bg-secondary/40 has-focus-visible:border-primary">
        <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-primary ring-4 ring-secondary">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview or the stored logo
            <img src={shown} alt="Logo del club" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-8" aria-hidden />
          )}
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card transition-transform group-hover:scale-110">
            <Camera className="size-3.5" aria-hidden />
          </span>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold text-primary">{shown ? "Cambiar logo" : "Subir logo"}</span>
          <span className="text-xs font-normal text-muted-foreground">{props.hint}</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFile}
          className="sr-only"
        />
      </label>
      {crop && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-4">
          <p className="text-sm font-normal text-muted-foreground">
            Arrastra la imagen para elegir la parte cuadrada de tu logo.
          </p>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragRef.current = null)}
            className="relative cursor-grab touch-none overflow-hidden rounded-xl bg-muted active:cursor-grabbing"
            style={{ width: FRAME_PX, height: FRAME_PX }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL being cropped */}
            <img
              ref={imageRef}
              src={crop.src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ left: crop.x, top: crop.y, width: shownWidth, height: shownHeight }}
            />
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-[999px] ring-black/30" />
          </div>
          <label className="flex w-full items-center gap-3 text-sm font-normal">
            Zoom
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              onChange={(event) => onZoom(Number(event.target.value))}
              className="flex-1 accent-primary"
            />
          </label>
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="h-10 flex-1" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="button" className="h-10 flex-1" onClick={confirm}>
              Usar este recorte
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
