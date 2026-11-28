"use client";

import { SelectPicker } from "@/components/date-time-pickers";
import { Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  createInvitationAction,
  removeMemberAction,
  type InviteState,
  type RemoveMemberState,
} from "./actions";

export function InviteForm({ clubSlug }: { clubSlug: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvitationAction, {
    status: "idle",
  });
  const [copied, setCopied] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <SelectPicker
        label="Rol"
        name="role"
        defaultValue="helper"
        options={[
          { value: "helper", label: "Ayudante: aprueba pagos y maneja el día de juego" },
          { value: "admin", label: "Administrador: todo, incluidas las finanzas" },
        ]}
      />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        Crear link de invitación
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "done" && (
        <div className="flex flex-col gap-2">
          <input
            readOnly
            value={state.link}
            aria-label="Link de invitación"
            className={fieldClass}
          />
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link);
              setCopied(true);
            }}
          >
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <p className="text-xs text-zinc-500">
            Mándalo por WhatsApp. Sirve una sola vez y vence en 7 días.
          </p>
        </div>
      )}
    </form>
  );
}

export function RemoveMemberForm(props: { clubSlug: string; userId: string; name: string }) {
  const [state, action, pending] = useActionState<RemoveMemberState, FormData>(removeMemberAction, {
    status: "idle",
  });
  const form = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <form ref={form} action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="clubSlug" value={props.clubSlug} />
      <input type="hidden" name="userId" value={props.userId} />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={pending}
        aria-label={`Quitar a ${props.name} del club`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden />
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      {confirming && (
        <ConfirmDialog
          title="¿Quitar a este organizador?"
          description={`${props.name} ya no podrá entrar al panel del club. Puedes volver a invitarlo cuando quieras.`}
          confirmLabel="Quitar"
          onConfirm={() => {
            setConfirming(false);
            form.current?.requestSubmit();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </form>
  );
}
