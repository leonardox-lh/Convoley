"use client";

import { useActionState } from "react";
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
          <input name="name" required placeholder="Amateur, Competitivo…" className={floatingFieldClass} />
        </Field>
        <Button type="submit" className="h-11" disabled={pending}>
          Crear
        </Button>
      </div>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}

export function CommunityRow(props: { clubSlug: string; id: string; name: string }) {
  const [renameState, rename, renaming] = useActionState(renameCommunityAction, IDLE);
  const [deleteState, remove, removing] = useActionState(deleteCommunityAction, IDLE);
  const error = [renameState, deleteState].find((state) => state.status === "error");
  const pending = renaming || removing;

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
          <Button type="submit" variant="outline" className="h-11" disabled={pending}>
            Guardar
          </Button>
        </form>
        <form action={remove}>
          <input type="hidden" name="clubSlug" value={props.clubSlug} />
          <input type="hidden" name="communityId" value={props.id} />
          <Button
            type="submit"
            variant="ghost"
            className="h-11"
            disabled={pending}
            aria-label={`Eliminar ${props.name}`}
          >
            Eliminar
          </Button>
        </form>
      </div>
      {error?.status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
    </li>
  );
}
