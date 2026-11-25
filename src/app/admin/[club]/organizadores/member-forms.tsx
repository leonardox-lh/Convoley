"use client";

import { useActionState, useState } from "react";
import { Field, fieldClass, FormMessage } from "@/components/form";
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
      <Field label="Rol" float="always">
        <select name="role" defaultValue="helper" className={fieldClass}>
          <option value="helper">Ayudante: aprueba pagos y maneja el día de juego</option>
          <option value="admin">Administrador: todo, incluidas las finanzas</option>
        </select>
      </Field>
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

export function RemoveMemberForm({ clubSlug, userId }: { clubSlug: string; userId: string }) {
  const [state, action, pending] = useActionState<RemoveMemberState, FormData>(removeMemberAction, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Quitar
      </Button>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
