"use client";

import { Camera, RotateCcw } from "lucide-react";
import { startTransition, useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  recordScoreAction,
  startGameDayAction,
  uploadChampionPhotoAction,
  type GameDayState,
} from "./actions";

const IDLE: GameDayState = { status: "idle" };

export type Target = { clubSlug: string; eventId: string };

export function TargetFields(props: Target) {
  return (
    <>
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="eventId" value={props.eventId} />
    </>
  );
}

/** Builds the fixture; starting again asks first because it wipes every score. */
export function StartGameDayForm(props: Target & { hasMatches: boolean }) {
  const [state, action, pending] = useActionState(startGameDayAction, IDLE);
  const form = useRef<HTMLFormElement>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <TargetFields {...props} />
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {props.hasMatches ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
          onClick={() => setConfirmingRestart(true)}
        >
          <RotateCcw aria-hidden />
          Reiniciar partidos
        </Button>
      ) : (
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          Empezar partidos
        </Button>
      )}
      {confirmingRestart && (
        <ConfirmDialog
          title="¿Reiniciar los partidos?"
          description="Se borrará toda la información de los partidos: el fixture y todos los resultados. Esto no se puede deshacer."
          confirmLabel="Reiniciar"
          onConfirm={() => {
            setConfirmingRestart(false);
            form.current?.requestSubmit();
          }}
          onCancel={() => setConfirmingRestart(false)}
        />
      )}
    </form>
  );
}

const scoreClass =
  "w-14 rounded-md border border-zinc-300 bg-white px-1 py-1.5 text-center text-lg font-semibold tabular-nums dark:border-zinc-700 dark:bg-zinc-900";

/** One match: both scores and a save button. */
export function MatchScoreForm(
  props: Target & {
    matchId: string;
    label: string;
    homeName: string;
    awayName: string;
    homeScore: number | null;
    awayScore: number | null;
    maxScore: number;
    /** Order, teams and delete controls, shown next to the label. */
    actions?: React.ReactNode;
  },
) {
  const [state, action, pending] = useActionState(recordScoreAction, IDLE);
  const played = props.homeScore !== null && props.awayScore !== null;
  const scoreInput = (name: string, value: number | null, team: string) => (
    <input
      type="number"
      name={name}
      min={0}
      max={props.maxScore}
      inputMode="numeric"
      defaultValue={value ?? ""}
      required
      aria-label={`Puntos de ${team} · ${props.label}`}
      className={scoreClass}
    />
  );
  return (
    // The controls hold forms of their own, so they sit outside the score form.
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-2 pt-2 font-medium uppercase">
          {props.label}
          {played && <span className="rounded-full bg-muted px-2 py-0.5 normal-case">Jugado</span>}
        </span>
        {props.actions}
      </div>
      <form action={action} className="flex flex-col gap-2">
        <TargetFields {...props} />
        <input type="hidden" name="matchId" value={props.matchId} />
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
          <span className="truncate text-right text-sm font-medium">{props.homeName}</span>
          {scoreInput("homeScore", props.homeScore, props.homeName)}
          <span className="text-zinc-400">–</span>
          {scoreInput("awayScore", props.awayScore, props.awayName)}
          <span className="truncate text-sm font-medium">{props.awayName}</span>
        </div>
        {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
        <Button
          type="submit"
          variant={played ? "outline" : "default"}
          className={
            played
              ? "border-primary text-primary hover:bg-primary/10 hover:text-primary"
              : undefined
          }
          disabled={pending}
        >
          {played ? "Corregir resultado" : "Guardar resultado"}
        </Button>
      </form>
    </div>
  );
}

// Phone photos run 3-6 MB; shrunk here they fit the 2 MB image limit and still look sharp on the banner.
const PHOTO_MAX_SIDE_PX = 1600;
const PHOTO_QUALITY = 0.85;

async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the photo"))),
      "image/jpeg",
      PHOTO_QUALITY,
    ),
  );
}

/** Take or pick the champion team's photo; the page's banner shows it. */
export function ChampionPhotoForm(props: Target & { hasPhoto: boolean }) {
  const [state, action, pending] = useActionState(uploadChampionPhotoAction, IDLE);
  const [shrinkFailed, setShrinkFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setShrinkFailed(false);
    try {
      const formData = new FormData();
      formData.set("clubSlug", props.clubSlug);
      formData.set("eventId", props.eventId);
      formData.set(
        "photo",
        new File([await shrinkPhoto(file)], "campeon.jpg", { type: "image/jpeg" }),
      );
      startTransition(() => action(formData));
    } catch {
      setShrinkFailed(true);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Foto del equipo campeón"
        onChange={(event) => onPick(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11 border-primary text-primary hover:bg-primary/10 hover:text-primary"
        disabled={pending}
        onClick={() => input.current?.click()}
      >
        <Camera aria-hidden />
        {pending
          ? "Subiendo…"
          : props.hasPhoto
            ? "Cambiar foto del equipo"
            : "Agregar foto del equipo"}
      </Button>
      {shrinkFailed && (
        <FormMessage tone="error">No pudimos leer esa foto. Prueba con otra.</FormMessage>
      )}
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </div>
  );
}
