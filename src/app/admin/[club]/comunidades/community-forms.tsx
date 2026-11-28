"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Modal } from "@/components/modal";
import { Field, fieldClass, floatingFieldClass, FormMessage } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  createCommunityAction,
  deleteCommunityAction,
  renameCommunityAction,
  type CommunityActionState,
} from "./actions";

const IDLE: CommunityActionState = { status: "idle" };

export function NewCommunityForm({ clubSlug }: { clubSlug: string }) {
  const [state, action, pending] = useActionState(createCommunityAction, IDLE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      <div className="flex gap-2">
        <Field label="Nueva comunidad o nivel" className="flex-1">
          <input
            name="name"
            required
            placeholder="Amateur, Competitivo…"
            className={floatingFieldClass}
          />
        </Field>
        <Button type="submit" className="h-11" disabled={pending}>
          Crear
        </Button>
      </div>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}

/** Why the database would refuse the delete, said upfront with what to do instead. */
function deleteBlockedReason(props: {
  isLast: boolean;
  eventCount: number;
  recurringEventCount: number;
}) {
  if (props.isLast) {
    return "Tu club necesita al menos una comunidad. Crea otra antes de eliminar esta.";
  }
  if (props.recurringEventCount > 0) {
    return "La usa una convocatoria recurrente, y esas no se pueden cambiar de comunidad. Por ahora no se puede eliminar; si ya no la necesitas, puedes cambiarle el nombre.";
  }
  if (props.eventCount > 0) {
    const events = props.eventCount === 1 ? "1 convocatoria" : `${props.eventCount} convocatorias`;
    return `Tiene ${events}. Para eliminarla, entra a cada convocatoria, tócale Editar (el lápiz junto a la fecha) y elige otra comunidad.`;
  }
  return null;
}

export function CommunityRow(props: {
  clubSlug: string;
  id: string;
  name: string;
  isLast: boolean;
  eventCount: number;
  recurringEventCount: number;
}) {
  const [renameState, rename, renaming] = useActionState(renameCommunityAction, IDLE);
  const [deleteState, remove, removing] = useActionState(deleteCommunityAction, IDLE);
  const error = [renameState, deleteState].find((state) => state.status === "error");
  const pending = renaming || removing;
  const deleteForm = useRef<HTMLFormElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const blockedReason = deleteBlockedReason(props);

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex gap-2">
        <form action={rename} className="flex flex-1 gap-2">
          <input type="hidden" name="clubSlug" value={props.clubSlug} />
          <input type="hidden" name="communityId" value={props.id} />
          <input
            name="name"
            required
            defaultValue={props.name}
            aria-label={`Nombre de ${props.name}`}
            className={fieldClass}
          />
          <Button
            type="submit"
            variant="outline"
            className="h-11 border-primary text-primary hover:bg-primary/10 hover:text-primary"
            disabled={pending}
          >
            Guardar
          </Button>
        </form>
        <form ref={deleteForm} action={remove}>
          <input type="hidden" name="clubSlug" value={props.clubSlug} />
          <input type="hidden" name="communityId" value={props.id} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={pending}
            aria-label={`Eliminar ${props.name}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        </form>
      </div>
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
      {confirmingDelete && blockedReason && (
        <Modal title="No se puede eliminar" onClose={() => setConfirmingDelete(false)}>
          <p className="text-sm text-muted-foreground">{blockedReason}</p>
          <Button type="button" className="mt-2 h-11" onClick={() => setConfirmingDelete(false)}>
            Entendido
          </Button>
        </Modal>
      )}
      {confirmingDelete && !blockedReason && (
        <ConfirmDialog
          title="¿Eliminar esta comunidad?"
          description={`"${props.name}" dejará de aparecer como nivel en tu club. Esto no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => {
            setConfirmingDelete(false);
            deleteForm.current?.requestSubmit();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  );
}
